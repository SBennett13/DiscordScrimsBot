#!/usr/bin/env python3
import requests
import sys

print("\nPossible routes:")
paths = ['/registry']
for i, p in enumerate(paths):
    print(str(i + 1) + ". " + p)

try:
    pathChoice = int(input("\n\nPath to make the request to: "))
    path = paths[pathChoice - 1]
except Exception as e:
    print("Error choosing path: " + str(e))
    sys.exit(1)
query = {}
while True:
    key = input("\nQuery key or Q to exit: ")
    if key == 'Q' or key == 'q':
        break
    value = input("Value for " + key + ": ")
    query[key] = value

queryString = ''
for k, v in query.items():
    if len(queryString) == 0:
        queryString = '?'
    if queryString[len(queryString)-1] != "?":
        queryString += '&'
    queryString += k + '=' + v

r = requests.get('http://localhost:1337' + path + queryString)
print("\n\nRequest made to: " + r.url)
print("res.json(): " + str(r.json()))
