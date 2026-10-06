from tests.conftest import PASSWORD, auth_headers, make_user
from database import SessionLocal
from models.user import User


def register(client, email="new@x.com", password=PASSWORD):
    return client.post("/auth/register", json={"email": email, "password": password, "full_name": "Имя"})


def test_register_and_login(client):
    assert register(client).status_code == 200
    r = client.post("/auth/login", json={"email": "new@x.com", "password": PASSWORD})
    assert r.status_code == 200 and r.json()["access_token"]


def test_register_sends_verification_email(client, outbox):
    register(client)
    assert [m[0] for m in outbox] == ["new@x.com"]


def test_short_password_rejected(client):
    assert register(client, password="short").status_code == 400


def test_too_long_password_rejected(client):
    assert register(client, password="a" * 80).status_code in (400, 422)


def test_email_is_case_insensitive(client):
    register(client, "Mixed@X.com")
    assert register(client, "mixed@x.com").status_code == 400
    assert client.post("/auth/login", json={"email": "MIXED@x.com", "password": PASSWORD}).status_code == 200


def test_login_works_for_legacy_mixed_case_email_in_db(client, db):
    make_user(db, "Legacy@Mail.com")
    r = client.post("/auth/login", json={"email": "legacy@mail.com", "password": PASSWORD})
    assert r.status_code == 200


def test_wrong_password_and_unknown_user_look_the_same(client, db):
    make_user(db, "a@x.com")
    wrong = client.post("/auth/login", json={"email": "a@x.com", "password": "wrongpass1"})
    unknown = client.post("/auth/login", json={"email": "nobody@x.com", "password": "wrongpass1"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_garbage_token_rejected(client):
    assert client.get("/auth/me", headers={"Authorization": "Bearer abc"}).status_code == 401


def test_token_of_deleted_user_rejected(client, db, user_h):
    db.query(User).delete()
    db.commit()
    assert client.get("/auth/me", headers=user_h).status_code == 401


def test_user_search_is_admin_only(client, user_h, admin_h):
    assert client.get("/auth/users/search?q=abc", headers=user_h).status_code == 403
    assert client.get("/auth/users/search?q=abc", headers=admin_h).status_code == 200


def test_user_search_treats_wildcards_literally(client, db, admin_h):
    make_user(db, "someone@x.com")
    assert client.get("/auth/users/search?q=%25%25%25", headers=admin_h).json() == []


def test_password_reset_flow(client, db, outbox):
    make_user(db, "r@x.com")
    client.post("/auth/forgot-password?email=R@x.com")
    token = db.query(User).filter(User.email == "r@x.com").first().reset_token
    assert token and outbox
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "abc"}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "brandnew123"}).status_code == 200
    assert client.post("/auth/login", json={"email": "r@x.com", "password": "brandnew123"}).status_code == 200
    # токен одноразовый
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "another123"}).status_code == 400


def test_reset_password_no_longer_accepts_query_params(client):
    assert client.post("/auth/reset-password?token=t&new_password=password123").status_code == 422


def test_forgot_password_does_not_reveal_unknown_email(client, outbox):
    r = client.post("/auth/forgot-password?email=ghost@x.com")
    assert r.status_code == 200 and not outbox


def test_change_password_requires_current(client, user_h):
    bad = client.post("/auth/change-password", headers=user_h, json={"current_password": "nope12345", "new_password": "newpass123"})
    assert bad.status_code == 400
    ok = client.post("/auth/change-password", headers=user_h, json={"current_password": PASSWORD, "new_password": "newpass123"})
    assert ok.status_code == 200
