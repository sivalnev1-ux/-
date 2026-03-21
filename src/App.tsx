import React, { useState, useRef } from 'react';
import { Mic, Camera, Search, ChefHat, Loader2, X } from 'lucide-react';
import Markdown from 'react-markdown';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Removed direct Gemini API initialization from client

export default function App() {
  const [ingredients, setIngredients] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipes, setRecipes] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recognition Setup
  const startListening = () => {
    setError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Голосовой ввод не поддерживается в вашем браузере. Попробуйте Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIngredients((prev) => {
        const separator = prev.trim() ? ', ' : '';
        return prev + separator + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setError('Ошибка распознавания голоса: ' + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Image Upload Setup
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsProcessingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          
          const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, mimeType: file.type })
          });

          let data;
          try {
            data = await response.json();
          } catch (e) {
            throw new Error('Server error');
          }

          if (!response.ok) {
            throw new Error(data.error || 'Server error');
          }

          const newIngredients = data.text || '';
          if (newIngredients) {
            setIngredients((prev) => {
              const separator = prev.trim() ? ', ' : '';
              return prev + separator + newIngredients;
            });
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Не удалось распознать ингредиенты на фото.');
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Не удалось распознать ингредиенты на фото.');
      setIsProcessingImage(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate Recipes
  const generateRecipes = async () => {
    if (!ingredients.trim()) {
      setError('Сначала перечислите ингредиенты!');
      return;
    }

    setError('');
    setIsGenerating(true);
    setRecipes('');

    try {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients })
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }
      setRecipes(data.text);
    } catch (err: any) {
      console.error(err);
      setError(`Ошибка при генерации рецептов: ${err.message || 'Попробуйте позже.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-amber-50 text-stone-800 font-sans selection:bg-orange-200 pb-safe relative bg-[url('/bg.jpg')] bg-fixed bg-center bg-cover">
      {/* Dark overlay to make text readable against the complex background */}
      <div className="absolute inset-0 bg-stone-900/60 z-0"></div>
      
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        
        {/* Header */}
        <header className="text-center mb-8 mt-4 sm:mb-10 sm:mt-6">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-orange-500 rounded-full text-white mb-3 sm:mb-4 shadow-lg shadow-orange-500/30">
            <ChefHat size={40} strokeWidth={1.5} className="sm:w-12 sm:h-12" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2 sm:mb-3 leading-tight drop-shadow-md">
            Не ссы,<br className="sm:hidden" /> Ольга Юриковна разрулит!
          </h1>
          <p className="text-base sm:text-lg text-stone-200 font-medium px-4 drop-shadow">
            Скажи, напиши или сфоткай, что есть в холодосе.
          </p>
        </header>

        {/* Input Section */}
        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-5 sm:p-8 mb-6 sm:mb-8 border border-stone-100">
          <label className="block text-xs sm:text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
            Твои ингредиенты
          </label>
          
          <div className="relative">
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Картошка, курица, помидоры..."
              className="w-full min-h-[120px] p-4 pr-16 bg-stone-50 border-2 border-stone-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors resize-y text-base sm:text-lg"
            />
            
            <div className="absolute right-2 bottom-2 flex flex-col gap-2">
              <button
                onClick={startListening}
                disabled={isListening}
                className={`p-3 rounded-xl transition-all touch-manipulation ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-white text-stone-500 hover:text-orange-500 hover:bg-orange-50 shadow-sm border border-stone-200'
                }`}
                title="Сказать голосом"
              >
                <Mic size={20} />
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="p-3 rounded-xl bg-white text-stone-500 hover:text-orange-500 hover:bg-orange-50 shadow-sm border border-stone-200 transition-all touch-manipulation"
                title="Сфотографировать"
              >
                {isProcessingImage ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 sm:p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
              <X size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={generateRecipes}
            disabled={isGenerating || !ingredients.trim()}
            className="w-full mt-5 sm:mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-lg sm:text-xl py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all transform active:scale-[0.98] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-3 touch-manipulation"
          >
            {isGenerating ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>Ольга Юриковна думает...</span>
              </>
            ) : (
              <>
                <Search size={24} />
                <span>Разрулить!</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {recipes && (
          <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-5 sm:p-8 border border-stone-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="prose prose-stone prose-base sm:prose-lg max-w-none prose-headings:font-black prose-h1:text-2xl sm:prose-h1:text-3xl prose-h2:text-xl sm:prose-h2:text-2xl prose-a:text-orange-600 prose-strong:text-orange-800">
              <Markdown>{recipes}</Markdown>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
