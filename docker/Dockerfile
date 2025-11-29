# Use nginx as base image
FROM nginx:alpine

# Copy our web files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx (this is the default command for nginx image)
CMD ["nginx", "-g", "daemon off;"]
