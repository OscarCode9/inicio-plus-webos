#!/usr/bin/env python3
"""SSH maintenance using only explicit local environment configuration."""
import os
from pathlib import Path
import subprocess


def ssh_args():
    host = os.environ.get('INICIO_TV_HOST')
    if not host:
        raise RuntimeError('Set INICIO_TV_HOST locally; no TV address is bundled.')
    key = Path(os.environ.get('INICIO_SSH_KEY', '~/.ssh/inicio_root')).expanduser()
    return ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
            '-o', 'HostKeyAlgorithms=+ssh-rsa', '-o', 'ConnectTimeout=5',
            '-i', str(key)], host


def run(command, timeout=30):
    options, host = ssh_args()
    process = subprocess.Popen(['ssh', *options, 'root@' + host, command],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    held_stdin = process.stdin
    process.stdin = None
    try:
        stdout, stderr = process.communicate(timeout=timeout)
        return subprocess.CompletedProcess([], process.returncode, stdout, stderr)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        raise
    finally:
        held_stdin.close()


def upload(source, destination, timeout=30):
    options, host = ssh_args()
    return subprocess.run(['scp', '-O', '-q', *options, str(source),
                           'root@' + host + ':' + destination],
                          capture_output=True, timeout=timeout)
