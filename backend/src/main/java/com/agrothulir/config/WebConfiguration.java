package com.agrothulir.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.Arrays;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private final TenantContextInterceptor tenantContextInterceptor;
    private final String origins;
    public WebConfiguration(TenantContextInterceptor tenantContextInterceptor,
        @Value("${agrothulir.cors-origins:http://localhost:5173}") String origins) {
        this.tenantContextInterceptor = tenantContextInterceptor;
        this.origins = origins;
    }

    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(tenantContextInterceptor); }
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/v1/**").allowedOriginPatterns(Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new))
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS").allowedHeaders("*");
    }
}
