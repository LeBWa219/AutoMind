# Сборка: Maven + JDK 21 в контейнере (на хосте Java не нужна)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# кэш зависимостей: пом отдельно, чтобы слой не пересобирался при правках кода
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B package -DskipTests

# Рантайм: только JRE, без JDK и Maven
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
