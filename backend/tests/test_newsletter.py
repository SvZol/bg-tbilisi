from tests.conftest import make_user


def test_preview_lists_exactly_who_will_receive(client, db, admin_h, event_id):
    make_user(db, "u1@x.com")
    make_user(db, "unverified@x.com", verified=False)
    p = client.get(f"/admin/events/{event_id}/notify-new/preview", headers=admin_h).json()
    emails = [r["email"] for r in p["recipients"]]
    assert "u1@x.com" in emails and "unverified@x.com" not in emails
    assert "Игра" in p["message"] and p["subject"]


def test_test_send_goes_only_to_admin(client, db, admin_h, event_id, outbox):
    make_user(db, "u1@x.com")
    r = client.post(f"/admin/events/{event_id}/notify-new", headers=admin_h,
                    json={"subject": "Тема", "message": "Текст", "test_only": True})
    assert r.json()["notified"] == 1
    assert [m[0] for m in outbox] == ["admin@x.com"]


def test_real_send_goes_to_all_verified(client, db, admin_h, event_id, outbox):
    make_user(db, "u1@x.com")
    make_user(db, "unverified@x.com", verified=False)
    r = client.post(f"/admin/events/{event_id}/notify-new", headers=admin_h, json={"subject": "Тема", "message": "Текст"})
    assert r.json()["notified"] == 2
    assert sorted(m[0] for m in outbox) == ["admin@x.com", "u1@x.com"]
    assert all(m[1] == "Тема" for m in outbox)


def test_message_html_is_escaped(client, admin_h, event_id, outbox):
    client.post(f"/admin/events/{event_id}/notify-new", headers=admin_h,
                json={"subject": "T", "message": "<script>alert(1)</script>\n\nвторой абзац", "test_only": True})
    html = outbox[0][2]
    assert "<script>" not in html and "&lt;script&gt;" in html and "второй абзац" in html


def test_requires_admin_and_non_empty_text(client, user_h, admin_h, event_id):
    body = {"subject": "T", "message": "m"}
    assert client.post(f"/admin/events/{event_id}/notify-new", headers=user_h, json=body).status_code == 403
    assert client.post(f"/admin/events/{event_id}/notify-new", headers=admin_h, json={"subject": "", "message": ""}).status_code == 422
    assert client.get(f"/admin/events/{event_id}/notify-new/preview", headers=user_h).status_code == 403


def test_titles_are_escaped_in_other_emails(outbox, monkeypatch):
    import core.email as em
    sent = []
    monkeypatch.setattr(em, "send_email", lambda to, subject, html: sent.append(html))
    em.send_reschedule_email("a@x.com", "<img src=x onerror=alert(1)>", "<b>team</b>", "2026-10-11", "2026-10-09")
    assert "<img src=x" not in sent[0] and "<b>team</b>" not in sent[0]
