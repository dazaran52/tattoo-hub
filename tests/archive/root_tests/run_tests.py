import os
import sys
import subprocess

env = os.environ.copy()
env["PYTHONPATH"] = os.path.join(os.path.dirname(__file__), "backend")

result = subprocess.run([sys.executable, "-m", "pytest", "tests/e2e/tier1_feature_coverage/", "-v"], capture_output=True, text=True, env=env)
print(result.stdout)
print(result.stderr)
sys.exit(result.returncode)

