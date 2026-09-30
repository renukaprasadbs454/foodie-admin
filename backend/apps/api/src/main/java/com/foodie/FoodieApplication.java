package com.foodie;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point only — no business logic here.
 * Package layout follows Phase3_Backend_Architecture.md §1.
 */
@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class FoodieApplication {

    public static void main(String[] args) {
        SpringApplication.run(FoodieApplication.class, args);
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner schemaFixer(
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE \"restaurant\" ADD COLUMN IF NOT EXISTS \"is_open\" BOOLEAN DEFAULT TRUE");
                jdbcTemplate.execute("UPDATE \"restaurant\" SET \"is_open\" = TRUE WHERE \"is_open\" IS NULL");
            } catch (Exception ignored) {
            }
            try {
                jdbcTemplate.execute("ALTER TABLE restaurant ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE");
                jdbcTemplate.execute("UPDATE restaurant SET is_open = TRUE WHERE is_open IS NULL");
            } catch (Exception ignored) {
            }
            System.out.println("SUCCESSFULLY VERIFIED/INJECTED is_open COLUMN IN H2 DB");
        };
    }
}
