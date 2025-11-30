FROM python:3.11-slim

WORKDIR /app

COPY webhook.py .

RUN pip install flask

CMD ["python3", "webhook.py"]
