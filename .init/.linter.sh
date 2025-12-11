#!/bin/bash
cd /home/kavia/workspace/code-generation/stock-growth-analyzer-221696-221706/stock_growth_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

