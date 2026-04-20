FROM python:3.11-slim

# Create working directory
WORKDIR /app

# Copy dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]