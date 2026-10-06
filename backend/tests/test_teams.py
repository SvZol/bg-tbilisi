from tests.conftest import PASSWORD, auth_headers, make_user


def create_team(client, headers, event_id, **extra):
    body = {"event_id": event_id, "name": "Лоси", "captain_phone": "+995555", **extra}
    return client.post("/teams/", headers=headers, json=body)


def test_create_team(client, user_h, event_id):
    r = create_team(client, user_h, event_id, members=[{"guest_name": "Гость", "guest_email": "g@x.com"}])
    assert r.status_code == 200
    assert len(r.json()["members"]) == 2


def test_guest_cannot_be_made_captain(client, user_h, event_id):
    r = create_team(client, user_h, event_id, members=[{"guest_name": "Гость", "role": "captain"}])
    assert [m["role"] for m in r.json()["members"]].count("captain") == 1


def test_duplicate_team_name_rejected(client, user_h, event_id):
    create_team(client, user_h, event_id)
    assert create_team(client, user_h, event_id).status_code == 400


def test_registration_closed(client, admin_h, user_h, event_id):
    client.patch(f"/admin/events/{event_id}/status?status=closed", headers=admin_h)
    assert create_team(client, user_h, event_id).status_code == 400


def test_child_category_needs_two_members(client, user_h, event_id):
    assert create_team(client, user_h, event_id, category="child").status_code == 400


def test_public_list_hides_personal_data(client, user_h, event_id):
    create_team(client, user_h, event_id, members=[{"guest_name": "Гость", "guest_email": "secret@x.com"}])
    team = client.get(f"/teams/event/{event_id}").json()[0]
    assert team["captain_phone"] is None
    assert all(m["guest_email"] is None for m in team["members"])
    assert "secret@x.com" not in client.get(f"/teams/event/{event_id}").text


def test_owner_sees_private_data(client, user_h, event_id):
    team_id = create_team(client, user_h, event_id, members=[{"guest_name": "Г", "guest_email": "g@x.com"}]).json()["id"]
    data = client.get(f"/teams/{team_id}", headers=user_h).json()
    assert data["captain_phone"] == "+995555"
    assert "g@x.com" in [m["guest_email"] for m in data["members"]]


def test_stranger_cannot_read_or_edit_team(client, db, user_h, event_id):
    team_id = create_team(client, user_h, event_id).json()["id"]
    make_user(db, "stranger@x.com")
    h = auth_headers(client, "stranger@x.com")
    assert client.get(f"/teams/{team_id}", headers=h).status_code == 403
    assert client.patch(f"/teams/{team_id}", headers=h, json={"name": "Взлом"}).status_code == 403
    assert client.post(f"/teams/{team_id}/members", headers=h, json={"guest_name": "X"}).status_code == 403


def test_admin_can_read_any_team(client, admin_h, user_h, event_id):
    team_id = create_team(client, user_h, event_id).json()["id"]
    assert client.get(f"/teams/{team_id}", headers=admin_h).status_code == 200


def test_rename_to_existing_name_rejected(client, db, user_h, event_id):
    create_team(client, user_h, event_id, name="Первая")
    make_user(db, "second@x.com")
    h2 = auth_headers(client, "second@x.com")
    team2 = create_team(client, h2, event_id, name="Вторая").json()["id"]
    assert client.patch(f"/teams/{team2}", headers=h2, json={"name": "Первая"}).status_code == 400


def test_invalid_guest_email_rejected(client, user_h, event_id):
    team_id = create_team(client, user_h, event_id).json()["id"]
    r = client.post(f"/teams/{team_id}/members", headers=user_h, json={"guest_name": "Z", "guest_email": "bad\r\nBcc: x@y.z"})
    assert r.status_code == 422


def test_cannot_remove_captain(client, user_h, event_id):
    team = create_team(client, user_h, event_id).json()
    captain = next(m for m in team["members"] if m["role"] == "captain")
    assert client.delete(f"/teams/{team['id']}/members/{captain['id']}", headers=user_h).status_code == 400


def test_invite_code_claim_flow(client, db, admin_h, user_h, event_id):
    team_id = create_team(client, user_h, event_id).json()["id"]
    code = client.post(f"/admin/teams/{team_id}/invite-code", headers=admin_h).json()["invite_code"]
    assert len(code) == 10
    make_user(db, "claimer@x.com")
    h = auth_headers(client, "claimer@x.com")
    assert client.get(f"/teams/by-invite/{code}").status_code == 200
    # у команды уже есть владелец — забрать нельзя
    assert client.post("/teams/claim", headers=h, json={"invite_code": code}).status_code == 400
