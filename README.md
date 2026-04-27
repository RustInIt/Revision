<h1 align="center">Revision</h1>

An easy to use self hosted [ScramJet](https://github.com/MercuryWorkshop/ScramJet) based proxy useful for evading internet censorship and getting access to previously restricted websites using a proof of concept port changing design to constantly remain in an unblocked state.

---

### Installing and Using Revision
Revision is intended to be used in a Linux environment using [Bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) (.sh), however, ~~Windows may work if you have [Git Bash](https://git-scm.com/downloads) installed~~.

[GitHub Codespaces](https://github.com/codespaces) _is recommended_ for self hosting as it serves Revision on a URL with the port built in. Create a new Codespace by clicking the green "**Code**" button, then clicking the plus (**+**) to create a new environment.

Once a new Codespace has been made and you have all of the project files, run the script below to automatically install, update, and run ScramJet with Revision installed.
```bash
bash scripts/init.sh
```

---

### Updates

As of **March 3rd, 2026**, I patched various bugs with GitHub Codespaces (hopefully) and now port auto forwarding should be resolved. Optimizations and overall bug fixes have been patched as well. After the setup for Revision is finished, it should automatically open a new tab with the proxy for you to use.

As of **April 27th, 2026**, I fixed Revision to work for the latest versions of ScramJet, as they completely redesigned their proxy's architecture. Revision now injects into the demo pages for ScramJet and works flawlessly. Revision also supports searches as well as links, using the DuckDuckGo search engine.

---

### Thank You ❤️
- [ScramJet](https://github.com/MercuryWorkshop/ScramJet) ~ Base proxy server and original inspiration for Revision

Any issues? [Reach out to me on Discord](https://discord.com/users/1002377371892072498) and I can try and help :3

---

### Setup Video
Confused? Watch this video to learn how to set it up in **one command**!

https://github.com/user-attachments/assets/b0998cc1-5281-49ab-8e95-970bd86c712e

