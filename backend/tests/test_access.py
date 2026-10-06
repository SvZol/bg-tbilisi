"""Кто что может: обычный пользователь не должен попадать в админку и в чужие данные."""
import pytest


@pytest.mark.parametrize("method,path", [
    ("get", "/admin/users"),
    ("get", "/admin/events"),
    ("post", "/admin/events"),
    ("get", "/admin/posts"),
    ("delete", "/admin/teams/00000000-0000-0000-0000-000000000000"),
    ("patch", "/admin/users/00000000-0000-0000-0000-000000000000/role"),
])
def test_admin_routes_forbidden_for_regular_user(client, user_h, method, path):
    assert getattr(client, method)(path, headers=user_h).status_code == 403


def test_admin_routes_require_auth(client):
    assert client.get("/admin/users").status_code in (401, 403)


def test_regular_user_cannot_create_event(client, user_h):
    r = client.post("/events/", headers=user_h, json={"title": "x"})
    assert r.status_code in (404, 405)


def test_event_status_validated(client, admin_h, event_id):
    assert client.patch(f"/admin/events/{event_id}/status?status=hacked", headers=admin_h).status_code == 400
    assert client.patch(f"/admin/events/{event_id}/status?status=closed", headers=admin_h).status_code == 200


def test_role_change_validated_and_not_self(client, db, admin_h):
    from tests.conftest import make_user
    other = make_user(db, "o@x.com")
    assert client.patch(f"/admin/users/{other.id}/role", headers=admin_h, json={"role": "superuser"}).status_code == 400
    assert client.patch(f"/admin/users/{other.id}/role", headers=admin_h, json={"role": "admin"}).status_code == 200
    me = client.get("/auth/me", headers=admin_h).json()["id"]
    assert client.patch(f"/admin/users/{me}/role", headers=admin_h, json={"role": "user"}).status_code == 400


def test_event_dates_validated(client, admin_h):
    r = client.post("/admin/events", headers=admin_h, json={
        "title": "x", "starts_at": "2026-10-11T16:00:00", "ends_at": "2026-10-11T12:00:00",
        "reg_deadline": "2026-10-09T23:59:00"})
    assert r.status_code == 422
