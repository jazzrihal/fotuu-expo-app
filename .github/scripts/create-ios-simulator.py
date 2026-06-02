#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys


def simctl_json(*args: str) -> dict:
    return json.loads(subprocess.check_output(["xcrun", "simctl", *args, "-j"]))


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split(".") if part.isdigit())


def main() -> None:
    runtimes = [
        runtime
        for runtime in simctl_json("list", "runtimes", "available")["runtimes"]
        if runtime.get("platform") == "iOS" and runtime.get("isAvailable", False)
    ]
    if not runtimes:
        raise SystemExit("No available iOS simulator runtimes found")

    runtime = sorted(runtimes, key=lambda candidate: version_key(candidate["version"]), reverse=True)[0]

    devices = [
        device
        for device in simctl_json("list", "devicetypes")["devicetypes"]
        if device["name"].startswith("iPhone")
    ]
    if not devices:
        raise SystemExit("No iPhone simulator device types found")

    preferred_names = [
        "iPhone 17",
        "iPhone 17 Pro",
        "iPhone 16",
        "iPhone 16 Pro",
        "iPhone 15",
        "iPhone 15 Pro",
        "iPhone 14",
        "iPhone 14 Pro",
    ]
    candidates = []
    for preferred_name in preferred_names:
        candidates.extend(device for device in devices if device["name"] == preferred_name)
    candidates.extend(device for device in devices if device not in candidates and "Max" not in device["name"])
    candidates.extend(device for device in devices if device not in candidates)

    for device in candidates:
        try:
            udid = subprocess.check_output(
                [
                    "xcrun",
                    "simctl",
                    "create",
                    "Fotuu E2E iPhone",
                    device["identifier"],
                    runtime["identifier"],
                ],
                stderr=subprocess.STDOUT,
                text=True,
            ).strip()
        except subprocess.CalledProcessError as error:
            print(
                f"Could not create {device['name']} for {runtime['name']}: {error.output.strip()}",
                file=sys.stderr,
            )
            continue

        print(f"Created simulator {udid} using {device['name']} and {runtime['name']}", file=sys.stderr)
        print(udid)
        return

    raise SystemExit(f"No compatible iPhone simulator device type found for {runtime['name']}")


if __name__ == "__main__":
    main()
