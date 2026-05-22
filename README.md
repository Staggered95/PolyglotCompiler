

# Polyglot Engine

![Main Dashboard](assets/main-dashboard.jpg)


A secure, containerized remote code execution (RCE) environment. It allows users to write and execute code in an isolated sandbox via a clean, minimalist web interface.

## Features

* **Isolated Execution:** Runs untrusted user code in ephemeral Docker containers.
* **High-Performance Queue:** Uses **Redis** and **BullMQ** to process concurrent execution requests asynchronously without crashing the server.
* **Resource Limits:** Prevents infinite loops and DoS attacks with strict limits (256MB RAM, 0.5 CPU, 5-second timeout).
* **Multiple Languages:** Currently supports Python (3.11) and Node.js (18).
* **Integrated IDE:** Vanilla HTML/CSS/JS frontend powered by CodeMirror, featuring live polling for job status.
* **DevOps CLI:** A built-in Bash management script for effortless building, testing, and teardown.
* **CI/CD Ready:** Includes a self-hosted Jenkins pipeline configuration for automated deployments.

## Prerequisites

Before starting, ensure your system has the following installed:

* **Docker & Docker Compose** (The engine relies entirely on containerization)
* **Git**
* **jq** (Command-line JSON processor required by the CLI)

⚠️ **Important:** Ensure **Port 5000** (API), **Port 6379** (Redis), and **Port 8080** (Jenkins) are free on your machine before starting the application.

## Quick Start

1. Clone the repository and navigate into the directory:
```bash
git clone https://github.com/Staggered95/PolyglotCompiler.git
cd PolyglotCompiler

```


2. Make the management script executable:
```bash
chmod +x ./scripts/manage.sh

```


3. Run the automated master command. This will check dependencies, pull base images, build the containers, start the API, automatically open the UI in your browser, and tail the server logs:
```bash
./scripts/manage.sh auto

```



## CI/CD Pipeline Setup (Jenkins)

This project includes a fully containerized Jenkins server to automate deployments. When new code is pushed to the repository, Jenkins will automatically rebuild the API and restart the containers with zero downtime.

**1. Boot the CI/CD Server**
Run the built-in CLI command to build and start the custom Jenkins container:

```bash
./scripts/manage.sh jenkins

```

**2. Unlock Jenkins**
The server will boot at `http://localhost:8080`. To get the initial admin password to unlock the dashboard, run:

```bash
docker logs jenkins

```

**3. Configure the Environment**

* Follow the setup wizard and click **"Install suggested plugins"**.
* Create your admin user account.
* Click **New Item**, name it `polyglot-engine`, and select **Pipeline**.

**4. Connect the Repository**

* Scroll down to the **Pipeline** section.
* Change "Definition" to **Pipeline script from SCM**.
* Select **Git** and paste this repository's URL.
* Ensure the branch is set to `*/main`.
* Under **Build Triggers**, check **Poll SCM** and enter `* * * * *` to allow Jenkins to check for new commits automatically. Save the configuration.

## CLI Reference (`manage.sh`)

The `manage.sh` script is the control center for the engine.

| Command | Description |
| --- | --- |
| `auto` | Runs setup, builds images, starts the UI, and attaches live logs. (Recommended) |
| `setup` | Checks for dependencies (`jq`, `docker`, `git`) and pulls required base Docker images. |
| `build` | Builds and tags the Express API and Sandbox Docker images. |
| `start` | Boots the engine and opens the UI in your default browser. |
| `test` | A UI-less, terminal-based way to write and execute code via your `$EDITOR`. |
| `restart` | Rebuilds the API image and restarts the containers. |
| `jenkins` | Builds and boots the local CI/CD Jenkins server. |
| `logs` | Tails the Docker logs with colorized `[ERROR]` and `[SUCCESS]` tags. |
| `clean` | Destroys all containers, custom images, and empties the `workspaces/` directory. |

## Architecture Map

* **`views/`**: Contains the vanilla frontend (HTML, CSS, JS). Features polling logic to check execution status.
* **`src/runner.ts`**: The Express API router. Accepts code, assigns a Job ID, and returns it to the client.
* **`src/redis.ts`**: The background worker process. Pulls jobs from the BullMQ queue, writes to temporary files, and orchestrates the Docker spawn process.
* **`containers/`**: Dockerfiles for the API server, the Jenkins CI/CD server, and the language-specific Alpine sandboxes.
* **`workspaces/`**: A shared Docker volume where temporary user scripts are written right before execution.