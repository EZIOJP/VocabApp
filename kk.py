import os


# Path to IP file (one step above this folder)
ip_file_path = os.path.join(os.path.dirname(__file__), '..',, '..', 'local_ip.txt')

with open(ip_file_path, 'r') as f:
    local_ip = f.read().strip()

try:
    with open(ip_file_path, 'r') as f:
        local_ip = f.read().strip()
except FileNotFoundError:
    local_ip = ''
    
from pathlib import Path