#!/bin/bash

# Production Deployment Script
# This script handles the complete deployment process to Vercel

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found. Creating from template..."
    if [ -f "env.production.template" ]; then
        cp env.production.template .env.production
        print_warning "Please update .env.production with your production values before deploying."
        exit 1
    else
        print_error "env.production.template not found. Cannot create .env.production"
        exit 1
    fi
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_error "Not logged in to Vercel. Please login first:"
    echo "vercel login"
    exit 1
fi

print_status "Running pre-deployment checks..."

# Run linting
print_status "Running ESLint..."
npm run lint

# Run tests
print_status "Running tests..."
npm run test:run

# Run E2E tests (optional)
if [ "$1" = "--with-e2e" ]; then
    print_status "Running E2E tests..."
    npm run test:e2e
fi

# Build the application
print_status "Building application..."
npm run build

# Check build output
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_success "Build completed successfully"

# Deploy to Vercel
print_status "Deploying to Vercel..."
if [ "$1" = "--preview" ]; then
    vercel
    print_success "Preview deployment completed"
else
    vercel --prod
    print_success "Production deployment completed"
fi

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls | head -n 2 | tail -n 1 | awk '{print $2}')
print_success "Deployment URL: $DEPLOYMENT_URL"

# Optional: Run post-deployment tests
if [ "$1" = "--with-tests" ]; then
    print_status "Running post-deployment tests..."
    # Add your post-deployment test commands here
fi

print_success "Deployment completed successfully! 🎉"
print_status "Don't forget to:"
echo "  - Verify the deployment in production"
echo "  - Check environment variables in Vercel dashboard"
echo "  - Monitor application logs"
echo "  - Update any external services with the new URL"
