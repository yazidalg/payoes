default: build

all: test

test:
	cargo test -p payoes-payment-router

build:
	stellar contract build --package payoes-payment-router

fmt:
	cargo fmt --all --check

clean:
	cargo clean