# Dockerfile for Eureka Server
FROM eclipse-temurin:21-jre-jammy
ARG JAR_FILE=target/eureka-server-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
