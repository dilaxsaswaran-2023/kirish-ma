package com.agrothulir.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private final TenantContextInterceptor tenantContextInterceptor;
    public WebConfiguration(TenantContextInterceptor tenantContextInterceptor) { this.tenantContextInterceptor = tenantContextInterceptor; }

    @Override public void addInterceptors(InterceptorRegistry registry) { registry.addInterceptor(tenantContextInterceptor); }
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/v1/**").allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS").allowedHeaders("*");
    }
}
