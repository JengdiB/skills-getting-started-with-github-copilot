import copy
import pytest

from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture(autouse=True)
def reset_activities():
    """Restore the in-memory activity store before each test."""
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities = original


@pytest.fixture
def client():
    return TestClient(app_module.app)


def test_root_redirect(client):
    response = client.get("/", follow_redirects=False)
    assert response.status_code in (301, 302, 307, 308)
    assert response.headers["location"] == "/static/index.html"


def test_get_activities(client):
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    # should at least contain the known keys
    assert "Chess Club" in data
    assert isinstance(data, dict)


def test_signup_success(client):
    email = "newstudent@mergington.edu"
    response = client.post(
        "/activities/Chess Club/signup", params={"email": email}
    )
    assert response.status_code == 200
    assert "Signed up" in response.json()["message"]
    # verify that the email was added
    assert email in app_module.activities["Chess Club"]["participants"]


def test_signup_already_signed(client):
    existing = app_module.activities["Chess Club"]["participants"][0]
    response = client.post(
        "/activities/Chess Club/signup", params={"email": existing}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up"


def test_signup_nonexistent_activity(client):
    response = client.post(
        "/activities/Nonexistent/signup", params={"email": "foo@bar.com"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_participant_success(client):
    # pick a participant that exists
    email = app_module.activities["Chess Club"]["participants"][0]
    response = client.delete(
        "/activities/Chess Club/participants", params={"email": email}
    )
    assert response.status_code == 200
    assert "Removed" in response.json()["message"]
    assert email not in app_module.activities["Chess Club"]["participants"]


def test_remove_participant_not_found(client):
    response = client.delete(
        "/activities/Chess Club/participants", params={"email": "nobody@nowhere"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found"


def test_remove_activity_not_found(client):
    response = client.delete(
        "/activities/Nope/participants", params={"email": "foo@bar.com"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
