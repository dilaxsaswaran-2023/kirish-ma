package com.agrothulir;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AgroThulirApplication {
    public static void main(String[] args) {
        SpringApplication.run(AgroThulirApplication.class, args);
    }
}
