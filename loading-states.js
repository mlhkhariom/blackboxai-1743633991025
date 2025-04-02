// Loading States Manager
class LoadingStates {
    constructor() {
        this.states = new Map();
        this.defaultSpinner = `
            <div class="loading-spinner-container flex items-center justify-center">
                <div class="loading-spinner"></div>
            </div>
        `;
    }

    // Start loading state for an element
    start(elementId, customSpinner = null) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Save original content
        this.states.set(elementId, element.innerHTML);

        // Add loading class
        element.classList.add('loading');

        // Add spinner if provided or use default
        if (customSpinner) {
            element.innerHTML = customSpinner;
        } else {
            element.innerHTML = this.defaultSpinner;
        }
    }

    // End loading state and restore content
    end(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Remove loading class
        element.classList.remove('loading');

        // Restore original content with fade-in animation
        const originalContent = this.states.get(elementId);
        if (originalContent) {
            element.style.opacity = '0';
            element.innerHTML = originalContent;
            
            // Trigger reflow
            element.offsetHeight;
            
            // Fade in
            element.style.transition = 'opacity 0.3s ease-in';
            element.style.opacity = '1';
            
            // Cleanup
            setTimeout(() => {
                element.style.removeProperty('transition');
                element.style.removeProperty('opacity');
            }, 300);

            this.states.delete(elementId);
        }
    }

    // Show error state
    error(elementId, message) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Remove loading class
        element.classList.remove('loading');

        // Add error state
        element.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>${message}</p>
            </div>
        `;

        // Store error state
        this.states.set(elementId, 'error');
    }

    // Check if element is in loading state
    isLoading(elementId) {
        return document.getElementById(elementId)?.classList.contains('loading') || false;
    }

    // Check if element is in error state
    isError(elementId) {
        return this.states.get(elementId) === 'error';
    }

    // Reset element to original state
    reset(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Remove loading and error states
        element.classList.remove('loading');
        const originalContent = this.states.get(elementId);
        if (originalContent && originalContent !== 'error') {
            element.innerHTML = originalContent;
        }
        this.states.delete(elementId);
    }

    // Add custom loading spinner
    addCustomSpinner(name, spinnerHTML) {
        this[name] = spinnerHTML;
    }
}

// Create and export singleton instance
const loadingStates = new LoadingStates();

// Add some custom spinners
loadingStates.addCustomSpinner('dots', `
    <div class="loading-dots">
        <div></div>
        <div></div>
        <div></div>
    </div>
`);

loadingStates.addCustomSpinner('pulse', `
    <div class="loading-pulse">
        <div class="pulse-ring"></div>
    </div>
`);

loadingStates.addCustomSpinner('progress', `
    <div class="loading-progress">
        <div class="progress-bar"></div>
    </div>
`);

export default loadingStates;