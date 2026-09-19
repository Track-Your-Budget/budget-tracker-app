FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# collectstatic boots Django, and some apps (simplejwt) read SECRET_KEY at
# import time - so the build needs *a* key even though it never signs anything.
# This throwaway value lives only for this RUN step; it is not an ENV layer and
# does not end up in the image. The real key comes from backend-secret at
# runtime. Do not remove it: the build otherwise depends on a stray .env in the
# build context, which is exactly what .dockerignore now excludes.
RUN DJANGO_SECRET_KEY=build-time-only-not-a-real-secret \
    python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
