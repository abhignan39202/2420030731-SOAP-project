FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -B -pl notification-service -am package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/notification-service/target/notification-service-0.0.1-SNAPSHOT.jar /app/notification-service.jar
EXPOSE 8090
ENTRYPOINT ["java", "-jar", "/app/notification-service.jar"]
