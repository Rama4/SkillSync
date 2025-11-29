# Simple Docker Web App

A basic web application demonstrating Docker containerization with a beautiful, responsive UI.

## 📁 Project Structure

```
docker/
├── Dockerfile          # Docker image configuration
├── docker-compose.yml  # Multi-container orchestration
├── index.html         # Main web page
├── style.css          # Styling
├── .dockerignore      # Files to ignore in Docker build
└── README.md          # This file
```

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Build and run the application:**
   ```bash
   cd docker
   docker-compose up --build
   ```

2. **Access the application:**
   Open your browser and go to: http://localhost:8080

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker Commands

1. **Build the Docker image:**
   ```bash
   cd docker
   docker build -t simple-web-app .
   ```

2. **Run the container:**
   ```bash
   docker run -d -p 8080:80 --name my-web-app simple-web-app
   ```

3. **Access the application:**
   Open your browser and go to: http://localhost:8080

4. **Stop and remove the container:**
   ```bash
   docker stop my-web-app
   docker rm my-web-app
   ```

## 🛠️ Development

### Making Changes

1. Edit the HTML, CSS, or other files
2. Rebuild the Docker image:
   ```bash
   docker-compose up --build
   ```

### Adding a Database

Uncomment the database service in `docker-compose.yml` to add PostgreSQL:

```bash
# Uncomment the db service and volumes sections
docker-compose up --build
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `docker-compose up` | Start the application |
| `docker-compose up --build` | Rebuild and start |
| `docker-compose down` | Stop the application |
| `docker-compose logs` | View application logs |
| `docker ps` | List running containers |
| `docker images` | List Docker images |

## 🔧 Customization

- **Change the port:** Modify the port mapping in `docker-compose.yml` (e.g., `"3000:80"`)
- **Add more services:** Add additional services to `docker-compose.yml`
- **Modify the UI:** Edit `index.html` and `style.css`

## 📝 Notes

- The application uses Nginx as the web server
- The container runs on port 80 internally, mapped to port 8080 on your host
- Files are copied into the container during the build process
- The application includes a responsive design that works on mobile devices

## 🐳 Docker Concepts Demonstrated

- **Dockerfile:** Defines how to build the container image
- **docker-compose.yml:** Orchestrates multiple containers
- **.dockerignore:** Excludes files from the build context
- **Port mapping:** Maps container ports to host ports
- **Volume mounting:** (Optional, for database persistence)

Enjoy exploring Docker! 🎉
