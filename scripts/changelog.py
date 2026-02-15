#!/usr/bin/env python3
"""
Generate changelog from git commits between two tags.
Categorizes commits by type (feat, fix, etc.)
"""

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Optional


@dataclass
class Commit:
    hash: str
    subject: str
    body: str


@dataclass
class CategorizedCommit:
    commit: Commit
    category: str
    scope: Optional[str]
    breaking: bool


CATEGORIES = {
    "feat": "✨ Features",
    "fix": "🐛 Bug Fixes",
    "docs": "📝 Documentation",
    "style": "💎 Styles",
    "refactor": "♻️ Code Refactoring",
    "perf": "⚡ Performance",
    "test": "✅ Tests",
    "build": "🏗️ Build System",
    "ci": "🔧 CI/CD",
    "chore": "🔨 Chores",
    "revert": "⏪ Reverts",
}


def run_git_command(args: list[str]) -> str:
    """Run a git command and return stdout"""
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout.strip()


def get_last_tag() -> Optional[str]:
    """Get the most recent tag"""
    try:
        return run_git_command(["describe", "--tags", "--abbrev=0"])
    except subprocess.CalledProcessError:
        return None


def get_commits_since(ref: Optional[str] = None) -> list[Commit]:
    """Get commits since the given ref (or all commits if None)"""
    if ref:
        range_spec = f"{ref}..HEAD"
    else:
        range_spec = "HEAD"
    
    # Format: hash<SEP>subject<SEP>body<END>
    output = run_git_command([
        "log", range_spec,
        f"--format=%H%x00%s%x00%b%x00",
        "--no-merges"
    ])
    
    if not output:
        return []
    
    commits = []
    # Split by null byte, filter out empty entries
    parts = [p for p in output.split("\x00") if p or p == ""]
    
    # Group into sets of 3 (hash, subject, body)
    for i in range(0, len(parts) - 1, 3):
        if i + 2 < len(parts):
            commits.append(Commit(
                hash=parts[i][:7],
                subject=parts[i + 1],
                body=parts[i + 2]
            ))
    
    return commits


def parse_conventional_commit(subject: str) -> CategorizedCommit:
    """Parse a conventional commit message"""
    # Pattern: type(scope)!: subject or type!: subject or type(scope): subject
    pattern = r"^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$"
    match = re.match(pattern, subject)
    
    if match:
        commit_type = match.group(1).lower()
        scope = match.group(2)
        breaking = match.group(3) == "!"
        subject_text = match.group(4)
    else:
        # Try to infer from keywords
        commit_type = "chore"
        scope = None
        breaking = "BREAKING CHANGE" in subject or "!" in subject
        subject_text = subject
    
    # Normalize the commit type
    if commit_type not in CATEGORIES:
        commit_type = "chore"
    
    return CategorizedCommit(
        commit=Commit(hash="", subject=subject_text, body=""),
        category=commit_type,
        scope=scope,
        breaking=breaking
    )


def categorize_commits(commits: list[Commit]) -> dict[str, list[CategorizedCommit]]:
    """Group commits by category"""
    categorized: dict[str, list[CategorizedCommit]] = {}
    
    for commit in commits:
        cat = parse_conventional_commit(commit.subject)
        cat.commit = commit  # Update with full commit info
        
        if cat.category not in categorized:
            categorized[cat.category] = []
        categorized[cat.category].append(cat)
    
    return categorized


def generate_changelog(version: str, categorized: dict[str, list[CategorizedCommit]]) -> str:
    """Generate markdown changelog"""
    lines = [f"## Release {version}", ""]
    
    # Breaking changes first
    breaking = []
    for cat_commits in categorized.values():
        for cc in cat_commits:
            if cc.breaking or "BREAKING CHANGE" in cc.commit.body:
                breaking.append(cc)
    
    if breaking:
        lines.extend(["### ⚠️ Breaking Changes", ""])
        for cc in breaking:
            lines.append(f"- {cc.commit.subject} ({cc.commit.hash})")
        lines.append("")
    
    # Regular categories
    for cat_key, title in CATEGORIES.items():
        if cat_key not in categorized:
            continue
        
        commits = categorized[cat_key]
        if not commits:
            continue
        
        lines.extend([f"### {title}", ""])
        for cc in commits:
            scope_str = f"**{cc.scope}**: " if cc.scope else ""
            lines.append(f"- {scope_str}{cc.commit.subject} ({cc.commit.hash})")
        lines.append("")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate changelog from git commits")
    parser.add_argument("--since", help="Start tag/commit (default: last tag)")
    parser.add_argument("--version", required=True, help="Version for the changelog header")
    parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    
    args = parser.parse_args()
    
    since = args.since or get_last_tag()
    commits = get_commits_since(since)
    
    if not commits:
        print("No commits found since last tag", file=sys.stderr)
        print("\n## Release {version}\n\nNo changes.\n".format(version=args.version))
        return
    
    categorized = categorize_commits(commits)
    changelog = generate_changelog(args.version, categorized)
    
    if args.output:
        with open(args.output, "w") as f:
            f.write(changelog)
        print(f"Changelog written to {args.output}")
    else:
        print(changelog)


if __name__ == "__main__":
    main()
