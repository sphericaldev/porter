# syntax=docker/dockerfile:1.1.7-experimental

# Base Go environment
# -------------------
FROM golang:1.20 as base
WORKDIR /porter

RUN apt-get update && apt-get install -y gcc musl-dev git

COPY go.mod go.sum Makefile ./
COPY /cli ./cli
COPY /internal ./internal
COPY /api ./api
COPY /ee ./ee
COPY /pkg ./pkg
COPY /provisioner ./provisioner

RUN --mount=type=cache,target=$GOPATH/pkg/mod \
    go mod download

# Go build environment
# --------------------
FROM base AS build-go

ARG SENTRY_DSN

RUN make build-cli-dev

# Deployment environment
# ----------------------
FROM ubuntu:latest
RUN apt-get update && apt-get install -y ca-certificates git

COPY --from=build-go /porter/bin/porter /bin/porter

ENTRYPOINT ["porter"]
