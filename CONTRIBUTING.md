# Contributing to Resumeee

We welcome contributions, bug fixes, suggestions, and feature enhancements to **Resumeee**!

---

## Contributor License Agreement (CLA)

By submitting a Pull Request to Resumeee, you agree to the terms of our [Contributor License Agreement](CLA.md).

### How to Accept the CLA
1. **Pull Request Checklist**: When opening a Pull Request, check the confirmation box indicating that you agree to the [CLA](CLA.md).
2. **Git Commit Sign-off (Recommended)**: Use the `-s` flag when committing (`git commit -s -m "feat: your description"`), which appends a `Signed-off-by: Your Name <your.email@example.com>` trailer to your commits confirming agreement with the terms.

---

## Getting Started

1. **Fork the Repository**: Create your own fork and clone it locally.
2. **Create a Branch**: Create a feature branch off `main` (`git checkout -b feat/my-improvement`).
3. **Run Tests & Linters**:
   ```bash
   go test -v ./...
   golangci-lint run ./...
   ```
4. **Submit a Pull Request**: Push your branch to your fork and submit a PR against `main`. Ensure all CI checks pass.
