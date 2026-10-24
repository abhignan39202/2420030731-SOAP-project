FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
ARG MODULE
COPY . .
RUN test -n "${MODULE}" && mvn -B -pl "${MODULE}" -am package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
ARG MODULE
COPY --from=build /workspace/${MODULE}/target/${MODULE}-0.0.1-SNAPSHOT.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
