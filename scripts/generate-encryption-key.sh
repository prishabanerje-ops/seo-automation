#!/bin/bash
echo "Generated JWT_SECRET (copy to .env):"
openssl rand -hex 32
