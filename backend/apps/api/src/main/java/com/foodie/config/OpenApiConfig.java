package com.foodie.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger configuration with bearer JWT scheme (Phase3 §11).
 * Controllers and DTOs are added per module — not in Phase A.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    OpenAPI foodieOpenApi() {
        return new OpenAPI()
                .servers(java.util.List.of(
                        new io.swagger.v3.oas.models.servers.Server()
                                .url("https://api.foodie.kwiko.org")
                                .description("Live Production API Server"),
                        new io.swagger.v3.oas.models.servers.Server()
                                .url("http://localhost:8082")
                                .description("Local Development Server (Port 8082)"),
                        new io.swagger.v3.oas.models.servers.Server()
                                .url("http://localhost:8080")
                                .description("Local Development Server (Port 8080)")
                ))
                .info(new Info()
                        .title("Foodie Platform API")
                        .description("Modular monolith REST API — contract-first (/api/v1). Live Server: https://api.foodie.kwiko.org")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
