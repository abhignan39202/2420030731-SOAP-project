package com.rhc.ambulanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatorCreateRequest {
    @NotNull
    private Long userId;
    @NotBlank
    private String name;
    private String phone;
}
