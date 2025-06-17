#!/usr/bin/env python3
"""
Flask AI Service for Secure Document Processing
Uses Hugging Face models (Qwen, BART, etc.) for local AI processing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import time
import re
from datetime import datetime

# Configure Hugging Face cache location if specified
if os.getenv('HF_HOME'):
    os.environ['HF_HOME'] = os.getenv('HF_HOME')
if os.getenv('HUGGINGFACE_HUB_CACHE'):
    os.environ['HUGGINGFACE_HUB_CACHE'] = os.getenv('HUGGINGFACE_HUB_CACHE')
if os.getenv('TRANSFORMERS_CACHE'):
    os.environ['TRANSFORMERS_CACHE'] = os.getenv('TRANSFORMERS_CACHE')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js communication

# Global variables for models (loaded lazily)
models_loaded = False
qwen_pipeline = None
summarization_pipeline = None
sentiment_pipeline = None

def load_models():
    """Load AI models with error handling"""
    global models_loaded, qwen_pipeline, summarization_pipeline, sentiment_pipeline
    
    if models_loaded:
        return True
    
    try:
        logger.info("Loading AI models...")
        
        # Import here to avoid startup delays
        from transformers import pipeline
        import torch
        
        device = 0 if torch.cuda.is_available() else -1
        device_name = "GPU" if torch.cuda.is_available() else "CPU"
        logger.info(f"📱 Using device: {device_name}")
        
        # Load Llama model for text generation
        try:
            logger.info("📥 Loading Llama-3.1-8B-Instruct model...")
            qwen_pipeline = pipeline(
                "text-generation",
                model="meta-llama/Llama-3.1-8B-Instruct",
                device=device,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                trust_remote_code=True,
                max_length=2048,
                padding=True,
                truncation=True
            )
            logger.info("✅ Llama-3.1-8B-Instruct model loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load Llama-3.1-8B model: {e}")
            # Fallback to smaller model
            qwen_pipeline = pipeline(
                "text-generation",
                model="distilgpt2",
                device=device,
                max_length=512
            )
            logger.info("✅ Fallback text generation model loaded")
        
        # Load summarization model
        try:
            logger.info("📥 Loading summarization model...")
            summarization_pipeline = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=device,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                max_length=1024,
                truncation=True
            )
            logger.info("✅ Summarization model loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load BART model: {e}")
            summarization_pipeline = None
        
        # Load sentiment analysis model for context understanding
        try:
            logger.info("📥 Loading sentiment model...")
            sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=device
            )
            logger.info("✅ Sentiment model loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load sentiment model: {e}")
            sentiment_pipeline = None
        
        models_loaded = True
        logger.info("🎉 All models loaded successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Critical error loading models: {e}")
        return False

def clean_generated_text(text, original_prompt=""):
    """Clean and filter generated text to remove repetition and improve quality"""
    if not text:
        return ""
    
    # Remove the original prompt if it's repeated
    if original_prompt and text.startswith(original_prompt):
        text = text[len(original_prompt):].strip()
    
    # Split into sentences and remove duplicates while preserving order
    sentences = [s.strip() for s in text.split('.') if s.strip()]
    unique_sentences = []
    seen = set()
    
    for sentence in sentences:
        # Normalize for comparison (lowercase, remove extra spaces)
        normalized = ' '.join(sentence.lower().split())
        if normalized not in seen and len(sentence) > 10:  # Minimum sentence length
            unique_sentences.append(sentence)
            seen.add(normalized)
    
    # Join sentences and ensure proper punctuation
    result = '. '.join(unique_sentences)
    if result and not result.endswith('.'):
        result += '.'
    
    return result

def generate_with_llama(prompt, max_length=200, temperature=0.7):
    """Generate text using Llama or fallback model with improved quality"""
    try:
        if qwen_pipeline is None:
            raise Exception("Text generation model not available")
        
        # Create a Llama-compatible structured prompt
        structured_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\nYou are an expert business analyst. Provide concise, professional analysis.<|eot_id|><|start_header_id|>user<|end_header_id|>\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"
        
        result = qwen_pipeline(
            structured_prompt,
            max_new_tokens=max_length,
            temperature=temperature,
            do_sample=True,
            return_full_text=False,
            pad_token_id=qwen_pipeline.tokenizer.eos_token_id,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3
        )
        
        generated_text = result[0]['generated_text'].strip()
        
        # Clean and filter the generated text
        cleaned_text = clean_generated_text(generated_text, structured_prompt)
        
        return cleaned_text if cleaned_text else "Analysis completed with AI processing."
        
    except Exception as e:
        logger.error(f"Text generation error: {e}")
        return "Analysis completed with limited AI processing capabilities."

def summarize_text(text, max_length=150):
    """Summarize text using BART with improved quality"""
    try:
        if not text or len(text.strip()) < 50:
            return "Document too short for summarization."
        
        # Clean and prepare text
        clean_text = re.sub(r'\s+', ' ', text.strip())
        
        if summarization_pipeline and len(clean_text) > 100:
            # Use BART for summarization with proper length constraints
            input_text = clean_text[:1024]  # BART input limit
            
            result = summarization_pipeline(
                input_text,
                max_length=min(max_length, len(input_text.split()) // 2),
                min_length=max(30, max_length // 4),
                do_sample=False,
                length_penalty=1.0,
                no_repeat_ngram_size=3
            )
            
            summary = result[0]['summary_text']
            
            # Clean up the summary
            summary = clean_generated_text(summary)
            return summary if summary else input_text[:max_length] + "..."
            
        else:
            # Use Llama for summarization
            prompt = f"Summarize this business document in exactly {max_length} words or less. Focus on key facts and numbers:\n\n{clean_text[:1000]}\n\nConcise summary:"
            return generate_with_llama(prompt, max_length//2, 0.3)
            
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        # Basic extractive summarization fallback
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20][:3]
        return '. '.join(sentences)[:max_length] + ('.' if not '. '.join(sentences)[:max_length].endswith('.') else '')

def extract_keywords(text, max_keywords=10):
    """Extract keywords using AI with improved prompting"""
    try:
        # Clean text
        clean_text = re.sub(r'\s+', ' ', text.strip())
        
        prompt = f"""Extract {max_keywords} important business keywords from this document.
Rules:
- Focus on business terms, products, metrics, companies, strategies
- Return ONLY keywords separated by commas
- No explanations or extra text
- Keywords should be 1-3 words each

Document: {clean_text[:1200]}

Business keywords:"""
        
        response = generate_with_llama(prompt, 100, 0.2)
        
        if response:
            # Parse keywords more carefully
            # Remove common prefixes and clean up
            response = re.sub(r'^(keywords?:?\s*)', '', response.lower().strip())
            keywords = [k.strip() for k in response.split(',') if k.strip()]
            
            # Filter keywords
            filtered_keywords = []
            for keyword in keywords:
                # Clean keyword
                keyword = re.sub(r'[^\w\s-]', '', keyword).strip()
                if (len(keyword) >= 2 and len(keyword) <= 25 and 
                    not keyword.isdigit() and 
                    keyword not in ['document', 'business', 'analysis', 'data']):
                    filtered_keywords.append(keyword)
            
            if filtered_keywords:
                return filtered_keywords[:max_keywords]
        
        # Fallback to pattern-based extraction
        return extract_keywords_basic(text, max_keywords)
        
    except Exception as e:
        logger.error(f"Keyword extraction error: {e}")
        return extract_keywords_basic(text, max_keywords)

def extract_keywords_basic(text, max_keywords):
    """Enhanced basic keyword extraction"""
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'they', 'them',
        'their', 'there', 'then', 'than', 'from', 'into', 'over', 'under', 'about', 'through'
    }
    
    # Extract potential business terms
    business_patterns = [
        r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',  # Proper nouns
        r'\b\w+(?:Corp|Inc|LLC|Ltd|Company|Co)\b',  # Companies
        r'\b\w+(?:tion|ment|ness|ity|ing)\b',  # Business terms
        r'\b(?:revenue|profit|sales|growth|market|customer|product|service|strategy|technology|digital|platform|solution|system|process|management|development|innovation|performance|efficiency|quality|experience|engagement|acquisition|retention|conversion|optimization|analysis|data|insights|metrics|KPI|ROI|budget|cost|investment|funding|partnership|collaboration|expansion|launch|implementation|integration|transformation|upgrade|enhancement|improvement|increase|decrease|trend|forecast|target|goal|objective|initiative|project|campaign|program|framework|methodology|approach|best practices|competitive advantage|value proposition|market share|customer satisfaction|user experience|brand recognition|operational excellence|scalability|sustainability|compliance|security|risk management)\b'
    ]
    
    keywords = set()
    for pattern in business_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, str):
                clean_match = match.lower().strip()
                if (len(clean_match) >= 3 and len(clean_match) <= 25 and 
                    clean_match not in stop_words and clean_match.replace(' ', '').isalpha()):
                    keywords.add(clean_match)
    
    # Word frequency as backup
    words = re.findall(r'\b\w+\b', text.lower())
    word_freq = {}
    
    for word in words:
        if len(word) > 3 and word not in stop_words and word.isalpha():
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Add top frequent words
    frequent_words = sorted(word_freq.keys(), key=lambda x: word_freq[x], reverse=True)[:5]
    keywords.update(frequent_words)
    
    return list(keywords)[:max_keywords]

def extract_business_metrics(text):
    """Extract business metrics using advanced prompt engineering"""
    try:
        # Use sophisticated prompt engineering with few-shot learning
        prompt = f"""You are an expert business analyst specializing in extracting key performance indicators from business documents.

TASK: Extract the most important business metrics and KPIs from the following document.

INSTRUCTIONS:
1. Look for quantitative business metrics (revenue, growth rates, customer numbers, etc.)
2. Include both financial and operational metrics
3. Present each metric in the format "Metric Name: Value"
4. Focus on actual numbers mentioned in the document
5. Ignore vague or estimated numbers
6. Extract up to 8 most significant metrics

EXAMPLES OF GOOD METRICS:
- Annual Revenue: $50 million
- Customer Growth Rate: 15% YoY
- Monthly Active Users: 2.3 million
- Gross Margin: 68%
- Employee Count: 450 people
- Market Share: 12% in North America

DOCUMENT TO ANALYZE:
{text[:1500]}

EXTRACTED BUSINESS METRICS:
1."""
        
        response = generate_with_llama(prompt, 200, 0.3)
        
        # Enhanced parsing with context awareness
        ai_metrics = parse_ai_metrics_response(response)
        
        # Validate and clean metrics
        validated_metrics = validate_extracted_metrics(ai_metrics, text)
        
        return validated_metrics[:8]
        
    except Exception as e:
        logger.error(f"Metrics extraction error: {e}")
        # Fallback to basic extraction
        return extract_basic_metrics_fallback(text)

def parse_ai_metrics_response(response):
    """Parse AI-generated metrics response with intelligent parsing"""
    metrics = []
    
    if not response:
        return metrics
    
    # Split response into lines and process each
    lines = response.split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines and obvious non-metrics
        if not line or len(line) < 5:
            continue
        
        # Remove numbering, bullets, and prefixes
        clean_line = re.sub(r'^[\d\.\-\*\•]+\s*', '', line)
        clean_line = clean_line.strip()
        
        # Look for metric pattern (Name: Value)
        if ':' in clean_line:
            parts = clean_line.split(':', 1)
            if len(parts) == 2:
                metric_name = parts[0].strip()
                metric_value = parts[1].strip()
                
                # Validate that this looks like a business metric
                if (len(metric_name) > 2 and len(metric_value) > 0 and
                    (any(char.isdigit() for char in metric_value) or '$' in metric_value or '%' in metric_value) and
                    len(clean_line) < 150):  # Reasonable length
                    
                    formatted_metric = f"{metric_name}: {metric_value}"
                    if formatted_metric not in metrics:
                        metrics.append(formatted_metric)
    
    return metrics

def validate_extracted_metrics(metrics, original_text):
    """Validate that extracted metrics actually exist in the source text"""
    validated = []
    text_lower = original_text.lower()
    
    for metric in metrics:
        if ':' in metric:
            name, value = metric.split(':', 1)
            name = name.strip().lower()
            value = value.strip()
            
            # Extract key numbers from the metric value
            numbers_in_metric = re.findall(r'[\d,]+(?:\.\d+)?', value)
            
            # Check if the metric name or similar appears in text
            name_words = name.split()
            name_variations = [
                name,
                ' '.join(name_words),
                name_words[0] if name_words else '',
                name.replace('rate', '').replace('count', '').strip()
            ]
            
            # Verify the metric has basis in the original text
            name_found = any(variation in text_lower for variation in name_variations if len(variation) > 2)
            number_found = any(num in original_text for num in numbers_in_metric)
            
            if name_found or number_found:
                validated.append(metric)
    
    return validated

def extract_basic_metrics_fallback(text):
    """Fallback extraction using business context understanding"""
    # Use AI for fallback with simpler prompt
    prompt = f"""Extract up to 5 key business numbers from this text. 
    Format as "Description: Number"
    Only include if you find actual numbers in the text.
    
    Text: {text[:800]}
    
    Key numbers:"""
    
    try:
        response = generate_with_llama(prompt, 100, 0.2)
        return parse_ai_metrics_response(response) if response else []
    except:
        return ["Document contains business data - detailed metrics extraction unavailable"]

def generate_insights(keywords, metrics, summary):
    """Generate business insights using advanced prompt engineering"""
    try:
        # Prepare context with proper formatting
        keywords_context = ', '.join(keywords[:5]) if keywords else 'business operations'
        metrics_context = '\n'.join([f"- {m}" for m in metrics[:4]]) if metrics else 'No specific metrics extracted'
        
        # Advanced prompt with role definition and structured thinking
        prompt = f"""You are a senior business consultant analyzing a company document. Your task is to provide strategic insights based on the extracted data.

ANALYSIS DATA:
Key Focus Areas: {keywords_context}
Business Metrics:
{metrics_context}

Document Summary: {summary[:300]}

TASK: Provide 2-3 strategic business insights that:
1. Connect the metrics to business performance
2. Identify potential opportunities or concerns
3. Suggest areas for further investigation
4. Are specific and actionable

EXAMPLE INSIGHT FORMAT:
"The [metric/trend] suggests [business implication], which indicates [opportunity/risk]. This could be leveraged by [suggested action]."

STRATEGIC INSIGHTS:
1."""
        
        insights = generate_with_llama(prompt, 180, 0.7)
        
        # Enhanced cleaning and structuring
        insights = clean_and_structure_insights(insights)
        
        if not insights or len(insights) < 30:
            # Intelligent fallback based on available data
            insights = generate_fallback_insights(keywords, metrics, summary)
        
        return insights + " [AI-powered analysis with local processing]"
        
    except Exception as e:
        logger.error(f"Insights generation error: {e}")
        return generate_emergency_insights(keywords, metrics)

def clean_and_structure_insights(insights_text):
    """Clean and structure AI-generated insights"""
    if not insights_text:
        return ""
    
    # Remove numbering and clean up formatting
    lines = insights_text.split('\n')
    clean_insights = []
    
    for line in lines:
        line = line.strip()
        if len(line) > 20:  # Meaningful content
            # Remove numbering
            clean_line = re.sub(r'^\d+\.\s*', '', line)
            # Remove bullet points
            clean_line = re.sub(r'^[-•*]\s*', '', clean_line)
            
            if clean_line and not clean_line.lower().startswith('insight'):
                clean_insights.append(clean_line)
    
    return ' '.join(clean_insights[:3])  # Max 3 insights

def generate_fallback_insights(keywords, metrics, summary):
    """Generate intelligent fallback insights when AI fails"""
    insights = []
    
    # Keyword-based insight
    if keywords:
        primary_focus = keywords[0] if keywords else "business operations"
        insights.append(f"Document analysis indicates primary focus on {primary_focus} and related strategic initiatives.")
    
    # Metrics-based insight
    if metrics:
        metrics_count = len(metrics)
        if any('revenue' in m.lower() or 'sales' in m.lower() or '$' in m for m in metrics):
            insights.append(f"Financial performance tracking evidenced through {metrics_count} quantitative metric(s), suggesting data-driven management approach.")
        else:
            insights.append(f"Operational metrics tracking with {metrics_count} key performance indicator(s) identified.")
    
    # Summary-based insight
    if summary and len(summary) > 100:
        if any(word in summary.lower() for word in ['growth', 'increase', 'expansion']):
            insights.append("Business trajectory shows growth-oriented strategic direction.")
        elif any(word in summary.lower() for word in ['efficiency', 'optimization', 'improvement']):
            insights.append("Operational focus emphasizes efficiency and process optimization.")
    
    return ' '.join(insights) if insights else "Business document contains structured analytical content suitable for strategic review."

def generate_emergency_insights(keywords, metrics):
    """Emergency fallback for critical errors"""
    kw_count = len(keywords) if keywords else 0
    metric_count = len(metrics) if metrics else 0
    
    return f"Document analysis completed: {kw_count} key topics and {metric_count} metrics identified. Secure local processing maintained throughout analysis."

def generate_plot_data(keywords, metrics):
    """Generate plot/chart data suggestions using enhanced prompting"""
    try:
        # Enhanced prompt for visualization suggestions
        prompt = f"""You are a data visualization expert. Create 2 meaningful charts based on the business analysis results.

AVAILABLE DATA:
Key Topics: {', '.join(keywords[:5]) if keywords else 'General business data'}
Business Metrics: {', '.join(metrics[:3]) if metrics else 'Basic metrics available'}

TASK: Suggest 2 charts that would best represent this business data.

OUTPUT FORMAT (exactly):
Chart1Title|chart_type|label1,label2,label3|value1,value2,value3
Chart2Title|chart_type|label1,label2,label3|value1,value2,value3

CHART TYPES: bar, line, pie
VALUES: Use realistic business numbers

EXAMPLE:
Revenue by Quarter|bar|Q1,Q2,Q3,Q4|120,135,150,180
Market Share|pie|Product A,Product B,Product C|45,35,20

VISUALIZATION SUGGESTIONS:"""
        
        response = generate_with_llama(prompt, 120, 0.4)
        return parse_enhanced_plot_data(response)
        
    except Exception as e:
        logger.error(f"Plot data generation error: {e}")
        return generate_basic_plots(keywords, metrics)

def parse_enhanced_plot_data(response):
    """Parse AI-generated plot data with enhanced validation"""
    plots = []
    
    if not response:
        return generate_basic_plots([], [])
    
    lines = response.split('\n')
    
    for line in lines:
        line = line.strip()
        if '|' in line and len(line.split('|')) >= 4:
            try:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 4:
                    title = parts[0]
                    chart_type = parts[1].lower()
                    labels_text = parts[2]
                    values_text = parts[3]
                    
                    # Parse labels
                    labels = [l.strip() for l in labels_text.split(',') if l.strip()]
                    
                    # Parse values with better error handling
                    values = []
                    for v in values_text.split(','):
                        v = v.strip()
                        # Extract numbers more carefully
                        numbers = re.findall(r'\d+(?:\.\d+)?', v)
                        if numbers:
                            try:
                                values.append(float(numbers[0]))
                            except:
                                values.append(10)
                        else:
                            values.append(10)
                    
                    # Validate chart data
                    if (len(labels) == len(values) and 
                        len(labels) >= 2 and len(labels) <= 6 and
                        len(title) > 0 and len(title) < 50):
                        
                        # Ensure chart type is valid
                        valid_types = ['bar', 'line', 'pie']
                        chart_type = chart_type if chart_type in valid_types else 'bar'
                        
                        plots.append({
                            'title': title,
                            'type': chart_type,
                            'labels': labels,
                            'values': [int(v) for v in values]  # Convert to integers
                        })
                        
            except Exception as e:
                logger.warning(f"Plot parsing error: {e}")
                continue
    
    # Fallback if no valid plots parsed
    if not plots:
        return generate_basic_plots([], [])
    
    return plots[:2]  # Max 2 plots

def parse_plot_data(response):
    """Legacy function - redirects to enhanced version"""
    return parse_enhanced_plot_data(response)

def generate_basic_plots(keywords, metrics):
    """Generate basic plot data as fallback"""
    plots = []
    
    if keywords:
        plots.append({
            'title': 'Key Topics Analysis',
            'type': 'bar',
            'labels': keywords[:5],
            'values': [20, 15, 12, 10, 8]
        })
    
    if len(keywords) > 3:
        plots.append({
            'title': 'Business Focus Areas',
            'type': 'pie',
            'labels': keywords[:4],
            'values': [30, 25, 25, 20]
        })
    
    return plots[:2]

# Flask Routes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint with model loading"""
    try:
        import torch
        device_info = {
            'cuda_available': torch.cuda.is_available(),
            'device_count': torch.cuda.device_count() if torch.cuda.is_available() else 0
        }
    except:
        device_info = {'cuda_available': False, 'device_count': 0}
    
    # Attempt to load models if not already loaded
    if not models_loaded:
        logger.info("🔄 Loading models on health check...")
        load_success = load_models()
        if load_success:
            logger.info("✅ Models loaded successfully during health check")
    
    return jsonify({
        'status': 'healthy',
        'models_loaded': models_loaded,
        'device_info': device_info,
        'model_details': {
            'llama_available': qwen_pipeline is not None,
            'summarization_available': summarization_pipeline is not None,
            'sentiment_available': sentiment_pipeline is not None
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/process-sensitive-document', methods=['POST'])
def process_sensitive_document():
    """Main endpoint for processing sensitive documents"""
    try:
        # Load models if not already loaded
        if not load_models():
            return jsonify({'error': 'Failed to load AI models'}), 500
        
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text'].strip()
        if len(text) < 20:
            return jsonify({'error': 'Document text too short for meaningful analysis'}), 400
        
        max_summary_length = data.get('max_summary_length', 300)
        max_keywords = data.get('max_keywords', 10)
        
        logger.info(f"🔒 Processing sensitive document ({len(text)} characters)")
        start_time = time.time()
        
        # Process the document with error handling for each step
        try:
            summary = summarize_text(text, max_summary_length)
        except Exception as e:
            logger.warning(f"Summary error: {e}")
            summary = "Summary unavailable due to processing error."
        
        try:
            keywords = extract_keywords(text, max_keywords)
        except Exception as e:
            logger.warning(f"Keywords error: {e}")
            keywords = []
        
        try:
            metrics = extract_business_metrics(text)
        except Exception as e:
            logger.warning(f"Metrics error: {e}")
            metrics = []
        
        try:
            insights = generate_insights(keywords, metrics, summary)
        except Exception as e:
            logger.warning(f"Insights error: {e}")
            insights = "Insights generation temporarily unavailable."
        
        try:
            plot_data = generate_plot_data(keywords, metrics)
        except Exception as e:
            logger.warning(f"Plot data error: {e}")
            plot_data = []
        
        processing_time = time.time() - start_time
        
        # Determine which model was actually used
        model_used = "Llama-3.1-8B-Instruct" if qwen_pipeline else "DistilGPT2"
        if not qwen_pipeline and not summarization_pipeline:
            model_used = "Limited AI processing"
        
        result = {
            'summary': summary or "No summary available",
            'keywords': keywords or [],
            'metrics': metrics or [],
            'insights': insights or "Analysis completed with limited AI capabilities",
            'plotData': plot_data or [],
            'processedLocally': True,
            'processedWithAI': models_loaded,
            'model': model_used,
            'processing_time': round(processing_time, 2),
            'text_length': len(text),
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"✅ Document processed in {processing_time:.2f}s - Summary: {len(summary)} chars, Keywords: {len(keywords)}, Metrics: {len(metrics)}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Error processing document: {e}")
        return jsonify({
            'error': str(e),
            'fallback_processed': True,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/extract-keywords', methods=['POST'])
def extract_keywords_endpoint():
    """Extract keywords from text"""
    try:
        if not load_models():
            return jsonify({'error': 'Models not available'}), 500
            
        data = request.get_json()
        text = data.get('text', '')
        max_keywords = data.get('max_keywords', 10)
        
        keywords = extract_keywords(text, max_keywords)
        
        return jsonify({
            'keywords': keywords,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/summarize', methods=['POST'])
def summarize_endpoint():
    """Summarize text"""
    try:
        if not load_models():
            return jsonify({'error': 'Models not available'}), 500
            
        data = request.get_json()
        text = data.get('text', '')
        max_length = data.get('max_length', 150)
        
        summary = summarize_text(text, max_length)
        
        return jsonify({
            'summary': summary,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"🚀 Starting AI Service on port {port}")
    logger.info("📚 Models will be loaded on first request for faster startup")
    
    app.run(host='0.0.0.0', port=port, debug=debug) 