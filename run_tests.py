import subprocess
result = subprocess.run(["python3", "-m", "pytest", "tests/e2e/tier1_feature_coverage/", "-v"], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
