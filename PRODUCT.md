# Lumbre
## Platform
web
## Stack
Delegated by user: Node.js Express AWS SDK v3, HTML CSS JavaScript, Docker Compose. Local execution; GitHub source delivery.
## Users
Photography laboratory student managing synthetic images in a private S3 bucket.
## Product Purpose
Upload, list, preview, download and delete images with short-lived presigned URLs and no browser AWS credentials.
## Capabilities and Constraints
Exercise 4: PUT URLs valid 300 seconds, GET URLs valid 900 seconds; JPEG PNG WebP strictly below 5 MiB; backend checks declared and actual file type and size; frontend drop zone and gallery. Minimize AWS credits; local Docker demo must be clearly distinguished from AWS.
## Operating Context
Existing us-east-1 bucket lab-09-dionicio-20261014, SSE-S3 and versioning. User deleted access key; live AWS tests require their new private credentials. No root credentials.
## Brand Commitments
Theme and design delegated to agent. Spanish interface named Lumbre.
## Principles
Images lead. No fabricated results. Credentials never enter frontend or repository. Local loopback binding.
