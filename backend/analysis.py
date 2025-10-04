class TypingAnalysisResult:
    def __init__(self, human_score: float, decision: str, reason: str = None, flags: list = None):
        self.human_score = human_score
        self.decision = decision  # approve, flag, block
        self.reason = reason
        self.flags = flags or []


def analyze_typing_pattern(typing_data: dict, content_length: int, space: str = "pulse") -> TypingAnalysisResult:
    
    # Metrics
    total_time = typing_data.get('totalTime', 0)
    thinking_time = typing_data.get('thinkingTime', 0)
    avg_speed = typing_data.get('averageSpeed', 0)
    backspace_count = typing_data.get('backspaceCount', 0)
    pause_count = typing_data.get('pauseCount', 0)
    speed_variance = typing_data.get('speedVariance', 0)
    
    score = 100
    flags = []

    #too little data
    if total_time < 1000 or content_length < 10: 
        return TypingAnalysisResult(
            human_score=50,
            decision="flag",
            reason="Insufficient typing data for analysis",
            flags=["insufficient_data"]
        )
    
    # Too fast
    if avg_speed > 8.0:
        score -= 30
        flags.append("speed_too_fast")
    
    # No corrections
    if content_length > 100 and backspace_count == 0:
        score -= 20
        flags.append("no_corrections")
    
    # No pauses
    if content_length > 100 and pause_count == 0:
        score -= 20
        flags.append("no_pauses")
    
    # Too consistent/robotic (low variance)
    if speed_variance < 50:
        score -= 15
        flags.append("too_consistent")
    
    # Instant start
    if thinking_time < 500:
        score -= 15
        flags.append("instant_start")
    
    # Positive indicators
    if backspace_count >= 3 and content_length > 50:
        score += 5 
    
    if pause_count >= 3 and content_length > 50:
        score += 5
    
    if speed_variance > 200:
        score += 5
    
    score = max(0, min(100, score))
    
    decision, reason = _determine_decision(score, flags, space)
    
    return TypingAnalysisResult(
        human_score=score,
        decision=decision,
        reason=reason,
        flags=flags
    )


def _determine_decision(score: float, flags: list, space: str) -> tuple:
    #Determine what action to take based on score and space
    
    if space == "pulse":
        # Pulse: copy-paste not allowed
        if score >= 85:
            return ("approve", None)
        elif score >= 40:
            return ("flag", "Typing pattern requires content verification")
        else:
            # Build reason from flags
            reason = "Suspicious typing pattern detected: "
            if "speed_too_fast" in flags:
                reason += "impossibly fast typing speed"
            elif "no_corrections" in flags and "no_pauses" in flags:
                reason += "no natural corrections or pauses"
            elif "instant_start" in flags and "too_consistent" in flags:
                reason += "robotic typing pattern"
            else:
                reason += "multiple anomalies detected"
            return ("block", reason)
    
    elif space == "creative":
        # Creative: copy-paste allowed
        if score >= 85:
            return ("approve", None)
        else:
            return ("flag", "Content requires AI verification")
    
    else:
        if score >= 70:
            return ("approve", None)
        elif score >= 40:
            return ("flag", "Typing pattern requires content verification")
        else:
            return ("block", "Suspicious typing pattern detected")


def get_analysis_summary(result: TypingAnalysisResult) -> dict:
    return {
        "human_score": result.human_score,
        "decision": result.decision,
        "reason": result.reason,
        "flags": result.flags
    }