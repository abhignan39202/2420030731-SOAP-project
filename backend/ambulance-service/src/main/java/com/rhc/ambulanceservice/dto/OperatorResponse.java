package com.rhc.ambulanceservice.dto;

import com.rhc.ambulanceservice.entity.OperatorStatus;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatorResponse {
    private Long id;
    private Long userId;
    private String name;
    private String phone;
    private OperatorStatus status;
}
