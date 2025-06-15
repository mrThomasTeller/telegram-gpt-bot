all: deploy

deploy:
	git pull && docker compose build && make start

start:
	docker compose up --detach && docker system prune -f

stop:
	docker compose stop

bash:
	docker exec -it gpt-tg-bot-app bash

prepare:
	docker || (curl -fsSL https://get.docker.com | sh)

docker-prune-unused:
	docker system prune -a
