import statistics
from statistics import StatisticsError


def calculate_typing_metrics(typing_data: dict, content_length: int) -> dict:
    #Calculate typing pattern metrics from typingg data

    intervals = typing_data.get('intervals', [])
    backspace_count = typing_data.get('backspaceCount', 0)
    pause_count = typing_data.get('pauseCount', 0)
    total_time = typing_data.get('totalTime', 0)
    thinking_time = typing_data.get('thinkingTime', 0)

    actual_typing_time = total_time - thinking_time
    average_speed = (content_length / actual_typing_time * 1000) if actual_typing_time > 0 else 0
    
    # Calculate speedVariance (standard deviation of intervals in ms)
    speed_variance = 0
    if len(intervals) > 1:
        try:
            speed_variance = statistics.stdev(intervals)
        except (ValueError, StatisticsError):
            speed_variance = 0
    
    error_correction_rate = (backspace_count / content_length * 100) if content_length > 0 else 0
    
    intervals_no_pauses = [i for i in intervals if i < 500]
    avg_keystroke_interval = statistics.mean(intervals_no_pauses) if intervals_no_pauses else 0
    
    pause_to_keystroke_ratio = pause_count / len(intervals) if len(intervals) > 0 else 0
    
    return {
        'totalTime': total_time,
        'thinkingTime': thinking_time,
        'averageSpeed': average_speed,
        'backspaceCount': backspace_count,
        'pauseCount': pause_count,
        'speedVariance': speed_variance,
        'intervalCount': len(intervals),
        'errorCorrectionRate': error_correction_rate,
        'avgKeystrokeInterval': avg_keystroke_interval,
        'pauseToKeystrokeRatio': pause_to_keystroke_ratio
    }


def calculate_typing_score(typing_data: dict, content_length: int) -> float:
    #Calculate typing authenticity score (0-100).

    metrics = calculate_typing_metrics(typing_data, content_length)

    total_time = metrics['totalTime']
    thinking_time = metrics['thinkingTime']
    avg_speed = metrics['averageSpeed']
    backspace_count = metrics['backspaceCount']
    pause_count = metrics['pauseCount']
    speed_variance = metrics['speedVariance']
    error_correction_rate = metrics['errorCorrectionRate']
    avg_keystroke_interval = metrics['avgKeystrokeInterval']

    score = 100
    
    # if insufficient data, return 50 score
    if total_time < 1000 or content_length < 10:
        return 50.0

    # Negative indicators

    if avg_speed > 12.0:
        score -= 30

    if content_length > 150 and backspace_count == 0:
        score -= 20

    if content_length > 100 and pause_count == 0:
        score -= 20

    if speed_variance < 30:
        score -= 15

    if thinking_time < 1000:
        score -= 15

    if avg_keystroke_interval < 40 and content_length > 50:
        score -= 25

    # Positive indicators:

    if 2.0 <= error_correction_rate <= 10.0:
        score += 10

    if backspace_count >= 3 and content_length > 50:
        score += 5

    if pause_count >= 2 and content_length > 50:
        score += 5

    # Score from 0 to 100
    return float(max(0, min(100, score)))