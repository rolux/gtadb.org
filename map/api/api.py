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

def check_landmark_data(key, value):
    if key == "ig_address":
        value = re.sub("\n", " ", value)
        value = re.sub("  ", " ", value.strip())
        return value
    if key == "ig_coordinates":
        # TODO
        return value
    if key == "rl_address":
        value = re.sub("\n", " ", value)
        value = re.sub("  ", " ", value.strip())
        value = re.sub(", United States$", "", value)
        value = re.sub(", USA$", "", value)
        return value
    if key == "tags":
        return sorted(list(set(tag.lower() for tag in value)))

def create_session(username):
    session_id = uuid.uuid4().hex
    sessions[session_id] = {"time": time.time(), "user": username}
    write_json(SESSIONS_FILE, sessions)
    return session_id

def get_color(name):
    sha1 = hashlib.sha1(name.encode("utf-8")).hexdigest()[-6:]
    rgb = tuple(int(int(sha1[i * 2:i * 2 + 2], 16) * 0.75) for i in range(3))
    return "".join(f"{v:02x}" for v in rgb)

def get_coordinates(address):
    if address and address not in geodata:
        result = gmaps.geocode(address)
        geodata[address] = result
        write_json(GEODATA_FILE, geodata)
    if not geodata[address]:
        print(f"### NO GEODATA FOR {address} ###")
        return []
    location = geodata[address][0]["geometry"]["location"]
    return location["lat"], location["lng"]

def get_hash(string):
    salt = os.urandom(16)
    hash = hashlib.pbkdf2_hmac("sha256", string.encode(), salt, 100_000)
    return base64.b64encode(salt + hash).decode()

def get_landmark_color(address):
    name = "???" if address in ("", "?") else address.split(", ")[0]
    for _ in range(3):
        name = re.sub(" \\([A-Z0-9\\?]+\\)$", "", name)
        if name[-1] != ")":
            break
    return get_color(name)

def get_new_landmark_id():
    last_id = list(landmarks.keys())[-1]
    return f"x{int(last_id[1:]) + 1}"

def read_json(filename):
    with open(filename, "r") as f:
        return json.load(f)

def test_against_hash(string, stored_hash):
    decoded = base64.b64decode(stored_hash)
    salt, stored_hash = decoded[:16], decoded[16:]
    test_hash = hashlib.pbkdf2_hmac("sha256", string.encode(), salt, 100_000)
    return hmac.compare_digest(stored_hash, test_hash)

def write_file(filename, data):
    filename_tmp = f"{filename}.tmp"
    with open(filename_tmp, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(data)
        fcntl.flock(f, fcntl.LOCK_UN)
    os.replace(filename_tmp, filename)

def write_json(filename, data, sort_fn=lambda kv: kv):
    jdata = "{\n"
    for i, (k, v) in enumerate(sorted(data.items(), key=sort_fn)):
        comma = "," if i < len(data) - 1 else ""
        jdata += f'    "{k}": {json.dumps(v, ensure_ascii=False, sort_keys=True)}{comma}\n'
    jdata += "}"
    write_file(filename, jdata)

def write_landmarks():
    write_json(LANDMARKS_FILE, landmarks, sort_fn=lambda kv: (kv[0][0], int(kv[0][1:])))

def write_log(item):
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(item) + "\n")



app = Flask(__name__)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = f"{ROOT_DIR}/data"
PHOTOS_DIR = f"{ROOT_DIR}/photos"
TILES_DIR = f"{ROOT_DIR}/tiles"
TRASH_DIR = f"{ROOT_DIR}/trash"
API_KEY_FILE = f"{DATA_DIR}/google_maps_api_key.txt"
CONFIG_FILE = f"{DATA_DIR}/config.json"
GEODATA_FILE = f"{DATA_DIR}/geodata.json"
INVITES_FILE = f"{DATA_DIR}/invites.json"
LANDMARKS_FILE = f"{DATA_DIR}/landmarks.json"
LOG_FILE = f"{DATA_DIR}/edit_log.jsonl"
SESSIONS_FILE = f"{DATA_DIR}/sessions.json"
USERS_FILE = f"{DATA_DIR}/users.json"

config = read_json(CONFIG_FILE)
geodata = read_json(GEODATA_FILE)
invites = read_json(INVITES_FILE)
landmarks = read_json(LANDMARKS_FILE)
sessions = read_json(SESSIONS_FILE)
users = read_json(USERS_FILE)

gmaps = googlemaps.Client(key=config["GOOGLE_MAPS_API_KEY"])



@app.route("/api", methods=["POST"])
def api():

    global invites

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
    user = sessions.get(session_id, {}).get("user")
    action = req.get("action")
    invite_code = req.get("invite_code")
    username = req.get("username")
    password = req.get("password")
    repeat_password = req.get("repeat_password")
    old_password = req.get("old_password")
    new_password = req.get("new_password")
    repeat_new_password = req.get("repeat_new_password")
    since = req.get("since")
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
        "edit_landmark", "remove_landmark"
    ) and landmark_id not in list(landmarks.keys()):
        return {"status": "error", "message": "Unknown landmark ID"}

    if action == "get_user":
        color = users[user]["color"] if user in users else get_color("???")
        return {"status": "ok", "username": user, "session_id": session_id, "profile_color": color}

    if action == "create_account":
        if not invite_code:
            return {"status": "error", "message": "Missing invite code"}
        if not any(
            test_against_hash(invite_code, invite_hash)
            for invite_hash in invites
        ):
            return {"status": "error", "message": "Invalid invite code"}
        if not username or not re.match("^[\\w-]+$", username):
            return {"status": "error", "message": "Invalid username"}
        if username in users:
            return {"status": "error", "message": "Username already exists"}
        if not password or not repeat_password:
            return {"status": "error", "message": "Missing password"}
        if password != repeat_password:
            return {"status": "error", "message": "Passwords do not match"}
        invites = {
            invite_hash: data
            for invite_hash, data in invites.items()
            if not test_against_hash(invite_code, invite_hash)
        }
        write_json(INVITES_FILE, invites)
        users[username] = {"color": get_color(username), "password_hash": get_hash(password)}
        write_json(USERS_FILE, users)
        session_id = create_session(username)
        response = make_response({"status": "ok", "session_id": session_id})
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
        if not users.get(username):
            return {"status": "error", "message": "Invalid credentials"}
        if not test_against_hash(password, users[username]["password_hash"]):
            return {"status": "error", "message": "Invalid credentials"}
        session_id = create_session(username)
        response = make_response({"status": "ok", "session_id": session_id})
        response.set_cookie("session_id", session_id, httponly=True, samesite="Lax")
        return response

    if action == "change_password":
        if not old_password or not new_password or not repeat_new_password:
            return {"status": "error", "message": "Missing password"}
        if not test_against_hash(old_password, users[username]["password_hash"]):
            return {"status": "error", "message": "Invalid credentials"}
        if new_password != repeat_new_password:
            return {"status": "error", "message": "Passwords do not match"}
        users[username]["password_hash"] = get_hash(new_password)
        write_json(USERS_FILE, users)
        return {"status": "ok"}

    if action == "logout":
        sessions.pop(session_id, None)
        write_json(SESSIONS_FILE, sessions)
        return {"status": "ok"}

    if action == "get_landmarks":
        if since is None or not os.path.exists(LOG_FILE):
            return {"status": "ok", "landmarks": landmarks}
        since = float(since)
        with open(LOG_FILE) as f:
            edited = {}
            for line in f:
                e_timestamp, e_user, e_action, e_id, e_data = json.loads(line)
                if e_timestamp >= since and e_user != user:
                    edited[e_id] = e_data
        return {"status": "ok", "landmarks": edited}

    if action == "add_landmark":
        if key != "ig_coordinates" or not value:
            return {"status": "error", "message": "missing in-game coordinates"}
        landmark_id = get_new_landmark_id()
        timestamp = time.time()
        landmarks[landmark_id] = [
            "?", value, [],
            "?", [], [],
            [], get_landmark_color("?"), timestamp
        ]
        write_log([timestamp, user, action, landmark_id, key, value])
        write_landmarks()
        return {"status": "ok", "id": landmark_id, "data": landmarks[landmark_id]}

    if action == "edit_landmark":
        landmark_keys = (
            "ig_address", "ig_coordinates", "ig_photo",
            "rl_address", "rl_coordinates", "rl_photo",
            "tags"
        )
        if key not in landmark_keys:
            return {"status": "error", "message": "Unknown landmark key"}
        index = landmark_keys.index(key)
        if key in ("ig_photo", "rl_photo"):
            if not file:
                landmarks[landmark_id][index] = []
            else:
                ext = file.filename.split(".")[-1].lower()
                if ext not in ("jpeg", "jpg", "png", "webp"):
                    return {"status": "error", "message": "Unsupported image file type"}
                source = key.split("_")[0]
                filename = f"{PHOTOS_DIR}/{landmark_id},{source}.jpg"
                image = Image.open(file.stream).convert("RGB")
                image.save(filename)
                value = image.size
                landmarks[landmark_id][index] = value
        else:
            value = check_landmark_data(key, value)
            landmarks[landmark_id][index] = value
            if key == "rl_address":
                landmarks[landmark_id][LM.RL_COORDINATES] = get_coordinates(value)
                landmarks[landmark_id][LM.COLOR] = get_landmark_color(value)
        timestamp = time.time()
        landmarks[landmark_id][LM.LAST_EDITED] = timestamp
        write_log([timestamp, user, action, landmark_id, key, value])
        write_landmarks()
        return {"status": "ok", "data": landmarks[landmark_id]}

    if action == "remove_landmark":
        write_log([time.time(), user, action, landmark_id, None, None])
        del landmarks[landmark_id]
        write_landmarks()
        for source in ("ig", "rl"):
            filename = f"{PHOTOS_DIR}/{landmark_id},{source}.jpg"
            if os.path.exists(filename):
                filename_new = f"{TRASH_DIR}/{landmark_id},{source},{int(time.time())}.jpg"
                os.replace(filename, filename_new)
        return {"status": "ok"}

    return {"status": "error", "message": "Invalid request"}



if __name__ == "__main__":

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(PHOTOS_DIR, exist_ok=True)

    INDEX_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # TODO: Disable these routes in producttion (handled by caddy)

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
        if path == "":
            path = "index.html"
        print("Serving static:", os.path.join(INDEX_DIR, path))
        return send_from_directory(INDEX_DIR, path)

    app.run(host="0.0.0.0", port=8080, debug=False)
