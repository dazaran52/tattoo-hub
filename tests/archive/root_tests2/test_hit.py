import requests

url = "http://localhost:8000/api/admin/users/26871c06-2686-406b-be67-86ad63f9505c/adjust-balance"
headers = {
    # No auth, it should return 401, NOT 500
}
res = requests.post(url)
print(res.status_code, res.text)
