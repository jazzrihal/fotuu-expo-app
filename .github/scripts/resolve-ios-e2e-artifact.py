#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path


BUILD_INPUT_PATHS = [
    ".github/workflows/e2e-ios-compile.yml",
    "app",
    "app.config.js",
    "app.config.ts",
    "app.json",
    "assets",
    "babel.config.js",
    "babel.config.json",
    "index.js",
    "ios",
    "metro.config.js",
    "metro.config.json",
    "package-lock.json",
    "package.json",
    "src",
    "tsconfig.json",
]


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def resolve_latest_artifact(repository: str, current_branch: str, current_run_id: str) -> dict | None:
    response = run(
        "gh",
        "api",
        f"repos/{repository}/actions/artifacts?name=ios-e2e-app&per_page=100",
    )
    artifacts = json.loads(response)["artifacts"]
    reusable_artifacts = [
        artifact
        for artifact in artifacts
        if not artifact["expired"]
        and artifact["workflow_run"]["head_branch"] == current_branch
        and str(artifact["workflow_run"]["id"]) != current_run_id
    ]
    if not reusable_artifacts:
        return None
    return sorted(reusable_artifacts, key=lambda artifact: artifact["created_at"], reverse=True)[0]


def commit_exists(sha: str) -> bool:
    return subprocess.run(
        ["git", "cat-file", "-e", f"{sha}^{{commit}}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    ).returncode == 0


def changed_build_inputs(source_sha: str, current_sha: str) -> list[str]:
    output = run("git", "diff", "--name-only", source_sha, current_sha, "--", *BUILD_INPUT_PATHS)
    return [line for line in output.splitlines() if line]


def write_outputs(**outputs: str) -> None:
    output_path = Path(env("GITHUB_OUTPUT"))
    with output_path.open("a", encoding="utf-8") as output_file:
        for name, value in outputs.items():
            output_file.write(f"{name}={value}\n")


def compile_with(current_run_id: str, artifact_source_sha: str = "") -> None:
    write_outputs(
        should_compile="true",
        artifact_run_id=current_run_id,
        artifact_source_sha=artifact_source_sha,
    )


def main() -> None:
    current_sha = env("CURRENT_SHA")
    current_branch = env("CURRENT_BRANCH")
    current_run_id = env("GITHUB_RUN_ID")
    repository = env("REPOSITORY")

    artifact = resolve_latest_artifact(repository, current_branch, current_run_id)
    if artifact is None:
        print(f"No previous ios-e2e-app artifact found for {current_branch}; compiling.")
        compile_with(current_run_id)
        return

    artifact_run_id = str(artifact["workflow_run"]["id"])
    artifact_source_sha = artifact["workflow_run"]["head_sha"]

    if not commit_exists(artifact_source_sha):
        print(f"Previous artifact source {artifact_source_sha} is not available locally; compiling.")
        compile_with(current_run_id, artifact_source_sha)
        return

    changed_files = changed_build_inputs(artifact_source_sha, current_sha)
    if changed_files:
        print(f"App/build inputs changed since artifact {artifact_run_id}; compiling.")
        print("\n".join(changed_files))
        compile_with(current_run_id, artifact_source_sha)
        return

    print(f"Reusing ios-e2e-app artifact {artifact_run_id} from {artifact_source_sha}.")
    write_outputs(
        should_compile="false",
        artifact_run_id=artifact_run_id,
        artifact_source_sha=artifact_source_sha,
    )


if __name__ == "__main__":
    main()
