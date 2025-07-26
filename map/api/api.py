import base64
from enum import IntEnum
import fcntl
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from flask import Flask, jsonify, make_response, request, send_from_directory
import googlemaps
from PIL import Image



class APIError(Exception):
    def __init__(self, message):
        self.message = message

class LM(IntEnum):
    IG_ADDRESS = 0
    IG_COORDINATES = 1
    IG_PHOTO = 2
    RL_ADDRESS = 3
    RL_COORDINATES = 4
    RL_PHOTO = 5
    TAGS = 6
    COLOR = 7
    LAST_EDITED = 8

LANDMARK_KEYS = [
    key.lower() for key in list(LM.__members__)
    if key not in ("COLOR", "LAST_EDITED")
]



def get_user(session_id):
    sessions = read_json(SESSIONS_FILE)
    return sessions.get(session_id, {}).get("user")

def user_exists(username):
    users = read_json(USERS_FILE)
    return username in users

def validate_user(username, password):
    users = read_json(USERS_FILE)
    user = users.get(username)
    return user and test_against_hash(password, user["password_hash"])

def validate_invite_code(invite_code):
    invites = read_json(INVITES_FILE)
    return any(
        test_against_hash(invite_code, invite_hash)
        for invite_hash in invites
    )

def remove_invite(invite_code):
    invites = read_json(INVITES_FILE)
    invites = {
        invite_hash: data
        for invite_hash, data in invites.items()
        if not test_against_hash(invite_code, invite_hash)
    }
    write_json(INVITES_FILE, invites)

def add_user(username, password):
    users = read_json(USERS_FILE)
    profile_color = get_color(username)
    users[username] = {"password_hash": get_hash(password), "profile_color": profile_color}
    write_json(USERS_FILE, users)

def create_session(username):
    sessions = read_json(SESSIONS_FILE)
    session_id = uuid.uuid4().hex
    sessions[session_id] = {"time": time.time(), "user": username}
    write_json(SESSIONS_FILE, sessions)
    return session_id

def remove_session(session_id):
    sessions = read_json(SESSIONS_FILE)
    sessions.pop(session_id, None)
    write_json(SESSIONS_FILE, sessions)

def change_password(username, new_password):
    users = read_json(USERS_FILE)
    users[username]["password_hash"] = get_hash(new_password)
    write_json(USERS_FILE, users)



def get_hash(string):
    salt = os.urandom(16)
    hash = hashlib.pbkdf2_hmac("sha256", string.encode(), salt, 100_000)
    return base64.b64encode(salt + hash).decode()

def test_against_hash(string, stored_hash):
    decoded = base64.b64decode(stored_hash)
    salt, stored_hash = decoded[:16], decoded[16:]
    test_hash = hashlib.pbkdf2_hmac("sha256", string.encode(), salt, 100_000)
    return hmac.compare_digest(stored_hash, test_hash)



def get_landmarks_since(game, since):
    if since is None:
        landmarks = read_json(LANDMARKS_FILE[game])
        return landmarks
    since = float(since)
    with open(LOG_FILE[game]) as f:
        landmarks = {}
        for line in f:
            timestamp, user, action, landmark_id, data = json.loads(line)
            if timestamp >= since:
                landmarks[landmark_id] = data
    return landmarks

def add_landmark(game, ig_coordinates, username):
    landmarks = read_json(LANDMARKS_FILE[game])
    last_id = list(landmarks.keys())[-1]
    landmark_id = f"x{int(last_id[1:]) + 1}"
    timestamp = time.time()
    landmarks[landmark_id] = [
        "", ig_coordinates, [],
        "", [], [],
        [], get_landmark_color(""), [timestamp, 0, 0]
    ]
    write_log(game, [timestamp, username, "add_landmark", landmark_id, None, None])
    write_log(game, [timestamp, username, "edit_landmark", landmark_id, "ig_coordinates", ig_coordinates])
    write_landmarks(game, landmarks)
    return landmark_id, landmarks[landmark_id]

def edit_landmark(game, landmark_id, key, value, file, username):
    landmarks = read_json(LANDMARKS_FILE[game])
    if landmark_id not in landmarks:
        raise APIError("Unknown landmark ID")
    index = LANDMARK_KEYS.index(key)
    if key in ("ig_photo", "rl_photo"):
        if not file:
            landmarks[landmark_id][index] = []
            source = key.split("_")[0]
            remove_photo(f"{PHOTOS_DIR}/{game}/{landmark_id},{source}.jpg")
        else:
            source = key.split("_")[0]
            filename = f"{PHOTOS_DIR}/{game}/{landmark_id},{source}.jpg"
            image = Image.open(file.stream).convert("RGB")
            image.save(filename)
            value = image.size
            landmarks[landmark_id][index] = value
    else:
        value = check_landmark_data(key, value)
        landmarks[landmark_id][index] = value
        if key == "rl_address":
            rl_coordinates = get_coordinates(value)
            color = get_landmark_color(value)
            landmarks[landmark_id][LM.RL_COORDINATES] = rl_coordinates
            landmarks[landmark_id][LM.COLOR] = color
    last_edited = landmarks[landmark_id][LM.LAST_EDITED]
    timestamp = time.time()
    landmarks[landmark_id][LM.LAST_EDITED] = [
        int(timestamp),
        int(timestamp) if key == "ig_photo" else last_edited[1],
        int(timestamp) if key == "rl_photo" else last_edited[2]
    ]
    write_log(game, [timestamp, username, "edit_landmark", landmark_id, key, value])
    if key == "rl_address":
        write_log(game, [timestamp, username, "edit_landmark", landmark_id, "rl_coordinates", rl_coordinates])
        write_log(game, [timestamp, username, "edit_landmark", landmark_id, "color", color])
    write_landmarks(game, landmarks)
    return landmarks[landmark_id]

def check_landmark_data(key, value):
    if key == "ig_address":
        value = re.sub("\n", " ", value)
        value = re.sub("  ", " ", value)
        value = value.strip()
        return value
    if key == "ig_coordinates":
        # TODO
        return value
    if key == "rl_address":
        value = re.sub("\n", " ", value)
        value = re.sub("  ", " ", value)
        value = value.strip()
        value = re.sub(", United States$", ", USA", value)
        value = re.sub(", États-Unis", ", USA", value)
        return value
    if key == "tags":
        return sorted(list(set(tag.lower() for tag in value)))

def remove_landmark(game, landmark_id, username):
    landmarks = read_json(LANDMARKS_FILE[game])
    if landmark_id not in landmarks:
        raise APIError("Unknown landmark ID")
    del landmarks[landmark_id]
    write_log(game, [time.time(), username, "remove_landmark", landmark_id, None, None])
    write_landmarks(game, landmarks)
    for source in ("ig", "rl"):
        remove_photo(f"{PHOTOS_DIR}/{landmark_id},{source}.jpg")

def remove_photo(filename):
    if os.path.exists(filename):
        filename_new = filename.replace(
            f"{PHOTOS_DIR}/", f"{TRASH_DIR}/"
        ).replace(
            ".jpg", f",{int(time.time())}.jpg"
        )
        os.makedirs(os.path.dirname(filename_new), exist_ok=True)
        os.replace(filename, filename_new)



def read_json(filename):
    with open(filename, "r") as f:
        return json.load(f)

def write_json(filename, data, sort_fn=lambda kv: kv):
    jdata = "{\n"
    for i, (k, v) in enumerate(sorted(data.items(), key=sort_fn)):
        comma = "," if i < len(data) - 1 else ""
        jdata += f'    "{k}": {json.dumps(v, ensure_ascii=False, sort_keys=True)}{comma}\n'
    jdata += "}"
    write_file(filename, jdata)

def write_file(filename, data):
    filename_tmp = f"{filename}.tmp"
    with open(filename_tmp, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(data)
        fcntl.flock(f, fcntl.LOCK_UN)
    os.replace(filename_tmp, filename)

def write_landmarks(game, landmarks):
    write_json(LANDMARKS_FILE[game], landmarks, sort_fn=lambda kv: (kv[0][0], int(kv[0][1:])))

def write_log(game, item):
    with open(LOG_FILE[game], "a") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")



def get_coordinates(address):
    if not address:
        return []
    geodata = read_json(GEODATA_FILE)
    if address not in geodata:
        result = gmaps.geocode(address)
        geodata[address] = result
        write_json(GEODATA_FILE, geodata)
    if not geodata[address]:
        return []
    location = geodata[address][0]["geometry"]["location"]
    return location["lat"], location["lng"]

def get_color(name):
    sha1 = hashlib.sha1(name.encode("utf-8")).hexdigest()[-6:]
    rgb = tuple(int(int(sha1[i * 2:i * 2 + 2], 16) * 0.75) for i in range(3))
    return "".join(f"{v:02x}" for v in rgb)

def get_landmark_color(address):
    name = "???" if address in ("", "?") else address.split(", ")[0]
    for _ in range(3):
        name = re.sub(" \\([A-Z0-9\\?]+\\)$", "", name)
        if name[-1] != ")":
            break
    return get_color(name)

def get_profile_color(username):
    users = read_json(USERS_FILE)
    return users[username]["profile_color"] if username in users else get_color("???")



ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = f"{ROOT_DIR}/data"
PHOTOS_DIR = f"{ROOT_DIR}/photos"
TILES_DIR = f"{ROOT_DIR}/tiles"
TRASH_DIR = f"{ROOT_DIR}/trash"
API_KEY_FILE = f"{DATA_DIR}/google_maps_api_key.txt"
CONFIG_FILE = f"{DATA_DIR}/config.json"
GEODATA_FILE = f"{DATA_DIR}/geodata.json"
INVITES_FILE = f"{DATA_DIR}/invites.json"
LANDMARKS_FILE = {
    "5": f"{DATA_DIR}/5/landmarks.json",
    "6": f"{DATA_DIR}/6/landmarks.json"
}
LOG_FILE = {
    "5": f"{DATA_DIR}/5/landmarks_log.jsonl",
    "6": f"{DATA_DIR}/6/landmarks_log.jsonl"
}
SESSIONS_FILE = f"{DATA_DIR}/sessions.json"
USERS_FILE = f"{DATA_DIR}/users.json"

config = read_json(CONFIG_FILE)
gmaps = googlemaps.Client(key=config["GOOGLE_MAPS_API_KEY"])

app = Flask(__name__)



@app.route("/api", methods=["POST"])
def api():

    if request.content_type and request.content_type.startswith("multipart/form-data"):
        req = request.form.to_dict()
        file = request.files.get("value")
    else:
        req = request.get_json()
        file = None
    if not req:
        return {"status": "error", "message": "Invalid request"}

    # print(f"{req=}")
    session_id = request.cookies.get("session_id")
    user = get_user(session_id)
    action = req.get("action")
    invite_code = req.get("invite_code")
    username = req.get("username")
    password = req.get("password")
    repeat_password = req.get("repeat_password")
    old_password = req.get("old_password")
    new_password = req.get("new_password")
    repeat_new_password = req.get("repeat_new_password")
    since = req.get("since")
    game = req.get("game")
    landmark_id = req.get("id")
    key = req.get("key")
    value = req.get("value")

    if action in (
        "create_account", "login"
    ) and (not username or not password):
        return {"status": "error", "message": "Missing credentials"}

    if action in (
        "change_password", "logout",
        "add_landmark", "edit_landmark", "remove_landmark"
    ) and not user:
        return {"status": "error", "message": "Unauthorized request"}

    if action in (
        "get_landmarks", "add_landmark", "edit_landmark", "remove_landmark"
    ) and game not in ("5", "6"):
        return {"status": "error", "message": "unknown game version"}

    if action == "get_user":
        profile_color = get_profile_color(user)
        return {"status": "ok", "username": user, "session_id": session_id, "profile_color": profile_color}

    if action == "create_account":
        if not invite_code:
            return {"status": "error", "message": "Missing invite code"}
        if not validate_invite_code(invite_code):
            return {"status": "error", "message": "Invalid invite code"}
        if not username or not re.match("^[\\w-]+$", username):
            return {"status": "error", "message": "Invalid username"}
        if user_exists(username):
            return {"status": "error", "message": "Username already exists"}
        if not password or not repeat_password:
            return {"status": "error", "message": "Missing password"}
        if password != repeat_password:
            return {"status": "error", "message": "Passwords do not match"}
        remove_invite(invite_code)
        add_user(username, password)
        session_id = create_session(username)
        profile_color = get_profile_color(user)
        response = make_response({
            "status": "ok",
            "username": username,
            "session_id": session_id,
            "profile_color": profile_color
        })
        response.set_cookie(
            "session_id",
            session_id,
            httponly=True,
            secure=True,
            samesite="Lax",
            path="/api"
        )
        return response

    if action == "login":
        if not validate_user(username, password):
            return {"status": "error", "message": "Invalid credentials"}
        session_id = create_session(username)
        profile_color = get_profile_color(username)
        response = make_response({
            "status": "ok",
            "username": username,
            "session_id": session_id,
            "profile_color": profile_color
        })
        response.set_cookie(
            "session_id",
            session_id,
            httponly=True,
            secure=True,
            samesite="Lax",
            path="/api"
        )
        return response

    if action == "change_password":
        if not old_password or not new_password or not repeat_new_password:
            return {"status": "error", "message": "Missing password"}
        if not test_against_hash(old_password, users[username]["password_hash"]):
            return {"status": "error", "message": "Invalid credentials"}
        if new_password != repeat_new_password:
            return {"status": "error", "message": "Passwords do not match"}
        change_password(username, new_password)
        return {"status": "ok"}

    if action == "logout":
        remove_session(session_id)
        return {"status": "ok"}

    if action == "get_landmarks":
        landmarks = get_landmarks_since(game, since)
        return {"status": "ok", "landmarks": landmarks}

    if action == "add_landmark":
        if key != "ig_coordinates" or not value:
            return {"status": "error", "message": "missing in-game coordinates"}
        landmark_id, landmark = add_landmark(game, value, user)
        return {"status": "ok", "id": landmark_id, "data": landmark}

    if action == "edit_landmark":
        if key not in LANDMARK_KEYS:
            return {"status": "error", "message": "Unknown landmark key"}
        if file and file.filename.split(".")[-1].lower() not in (
            "jpeg", "jpg", "png", "webp"
        ):
            return {"status": "error", "message": "Unsupported image file type"}
        try:
            landmark = edit_landmark(game, landmark_id, key, value, file, user)
        except APIError:
            return {"status": "error", "message": "Unknown landmark ID"}
        return {"status": "ok", "data": landmark}

    if action == "remove_landmark":
        try:
            remove_landmark(game, landmark_id, user)
        except APIError:
            return {"status": "error", "message": "Unknown landmark ID"}
        return {"status": "ok"}

    return {"status": "error", "message": "Invalid request"}



if __name__ == "__main__":

    # Run the api with caddy + gunicorn.
    # This is just a fallback.

    @app.route("/data/<path:filename>")
    def serve_data(filename):
        return send_from_directory(os.path.join(ROOT_DIR, "data"), filename)

    @app.route("/tiles/<path:filename>")
    def serve_tiles(filename):
        print("TILES:", filename)
        return send_from_directory(TILES_DIR, filename)

    @app.route("/photos/<path:filename>")
    def serve_photos(filename):
        return send_from_directory(PHOTOS_DIR, filename)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_static(path):
        return send_from_directory(ROOT_DIR, path or "index.html")

    app.run(host="0.0.0.0", port=8080, debug=False)
