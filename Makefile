all: deploy

deploy:
	git pull && docker compose build && make start

start:
	docker compose up --detach

stop:
	docker compose stop

bash:
	docker exec -it gpt-tg-bot-app bash

prepare:
	docker || (curl -fsSL https://get.docker.com | sh)