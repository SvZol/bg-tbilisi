import os

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
PDF = b"%PDF-1.4\n" + b"0" * 32


def upload_photo(client, headers, event_id, name, content, ctype="image/png"):
    return client.post(f"/admin/photos/{event_id}", headers=headers, files={"file": (name, content, ctype)})


def test_valid_image_saved_under_random_name(client, admin_h, event_id):
    r = upload_photo(client, admin_h, event_id, "photo.png", PNG)
    assert r.status_code == 200
    name = r.json()["filename"]
    assert name != "photo.png" and os.path.isfile(os.path.join("uploads", name))


def test_html_and_svg_rejected(client, admin_h, event_id):
    assert upload_photo(client, admin_h, event_id, "x.html", b"<script>alert(1)</script>", "text/html").status_code == 400
    assert upload_photo(client, admin_h, event_id, "x.svg", b"<svg onload=alert(1)>", "image/svg+xml").status_code == 400


def test_content_must_match_extension(client, admin_h, event_id):
    assert upload_photo(client, admin_h, event_id, "fake.png", b"<script>alert(1)</script>").status_code == 400


def test_path_traversal_in_filename_is_harmless(client, admin_h, event_id):
    r = upload_photo(client, admin_h, event_id, "../../evil.png", PNG)
    assert r.status_code == 200
    assert ".." not in r.json()["filename"] and "/" not in r.json()["filename"]


def test_oversized_file_rejected(client, admin_h, event_id):
    big = PNG + b"0" * (10 * 1024 * 1024)
    assert upload_photo(client, admin_h, event_id, "big.png", big).status_code == 413


def test_uploads_require_admin(client, user_h, event_id):
    assert upload_photo(client, user_h, event_id, "a.png", PNG).status_code == 403


def test_pdf_upload_and_delete(client, admin_h, event_id):
    r = client.post(f"/admin/events/{event_id}/pdfs", headers=admin_h, files={"file": ("a.pdf", PDF, "application/pdf")})
    assert r.status_code == 200
    path = os.path.join("uploads", "pdfs", r.json()["filename"])
    assert os.path.isfile(path)
    assert client.delete(f"/admin/pdfs/{r.json()['id']}", headers=admin_h).status_code == 200
    assert not os.path.exists(path)


def test_non_pdf_rejected_as_pdf(client, admin_h, event_id):
    r = client.post(f"/admin/events/{event_id}/pdfs", headers=admin_h, files={"file": ("a.pdf", b"not a pdf", "application/pdf")})
    assert r.status_code == 400
