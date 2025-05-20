#!/bin/bash

# Replace these values with your actual GitHub username and personal access token
echo "Please enter your GitHub username:"
read GITHUB_USERNAME

echo "Please enter your Personal Access Token (PAT):"
read GITHUB_PAT

# Update the remote URL with the token
git remote set-url origin https://$GITHUB_USERNAME:$GITHUB_PAT@github.com/garv-seth/Careerate.git

# Push to the dev branch
git push origin dev

echo "Push completed!"