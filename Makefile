install:
	npm install

test:
	node baselime-logger-test.js

run:
	npx wrangler pages dev ./ --kv=KV --r2=R2 --d1 D1=flaregun-dev -b ENV=dev -b BASELIME_API_KEY=${BASELIME_API_KEY}
