package com.foodie.order.service.impl;

import com.foodie.order.repository.OrderRepository;
import com.foodie.order.service.OrderNumberGenerator;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Human-readable order numbers: FD-yyyyMMdd-###### (Phase3 §3.5).
 */
@Component
public class RedisOrderNumberGenerator implements OrderNumberGenerator {

    private static final DateTimeFormatter DAY = DateTimeFormatter.BASIC_ISO_DATE;

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;
    private final OrderRepository orderRepository;

    @Autowired
    public RedisOrderNumberGenerator(StringRedisTemplate redisTemplate, @Lazy OrderRepository orderRepository) {
        this(redisTemplate, Clock.systemUTC(), orderRepository);
    }

    public RedisOrderNumberGenerator(StringRedisTemplate redisTemplate, Clock clock, OrderRepository orderRepository) {
        this.redisTemplate = redisTemplate;
        this.clock = clock;
        this.orderRepository = orderRepository;
    }

    @Override
    public String next() {
        LocalDate day = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        String dayKey = day.format(DAY);
        Long seq = null;
        try {
            seq = redisTemplate.opsForValue().increment("order:number:" + dayKey);
        } catch (Exception ex) {
            // Fallback if Redis is offline locally
        }
        if (seq == null || seq <= 0) {
            seq = (System.currentTimeMillis() % 900000) + 100000;
        }
        String candidate = "FD-" + dayKey + "-" + String.format("%06d", seq);
        if (orderRepository != null) {
            while (orderRepository.existsByOrderNumber(candidate)) {
                seq++;
                candidate = "FD-" + dayKey + "-" + String.format("%06d", seq);
            }
        }
        return candidate;
    }
}
