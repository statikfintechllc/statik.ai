# Contributing to CSA.OS

Thank you for your interest in contributing to CSA.OS! This is a research project pushing the boundaries of web platform capabilities.

## Philosophy

CSA.OS is built on these core principles:

1. **Zero Dependencies**: We use only web platform APIs, no third-party libraries
2. **Performance First**: Every line of code is optimized
3. **Research-Driven**: We explore cutting-edge browser capabilities
4. **iOS-Focused**: Leverage iOS Developer Mode to the fullest
5. **Privacy-Centric**: No external calls, no telemetry, no tracking

## How to Contribute

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly** (especially on iOS with Developer Mode)
5. **Commit with clear messages**: `git commit -m 'Add amazing feature'`
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Standards

#### JavaScript
- Use ES2024+ features
- No external dependencies
- Pure functions where possible
- Clear, descriptive variable names
- Comments for complex logic only
- Use async/await over promises.then()

#### File Organization
```
core/          - Core system modules
wasm/          - WebAssembly modules  
docs/          - Documentation
tests/         - Test files (future)
```

#### Naming Conventions
- Files: `kebab-case.js`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

#### Comments
```javascript
/**
 * Brief description of the function
 * 
 * @param {type} name - Description
 * @returns {type} Description
 */
function example(name) {
    // Implementation details only if non-obvious
}
```

### What We're Looking For

#### High Priority
- Performance optimizations
- iOS Developer Mode features
- WebAssembly compute modules
- Agent intelligence improvements
- System-level access implementations

#### Medium Priority
- Bug fixes
- Documentation improvements
- Code cleanup and refactoring
- Test infrastructure
- Examples and tutorials

#### Low Priority (Still Welcome!)
- UI enhancements
- Additional utility functions
- Developer experience improvements

### What We're NOT Looking For

❌ Third-party dependencies (except for build tools)  
❌ Heavy frameworks or libraries  
❌ Features requiring backend servers  
❌ Telemetry or analytics  
❌ Non-standard browser APIs  

## Development Setup

### Prerequisites
- Modern browser (Safari, Chrome, Edge)
- iOS device with Developer Mode (for full testing)
- Python 3 or Node.js (for local server)
- Text editor (VS Code recommended)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/statik.ai.git
cd statik.ai

# Start local server
python3 -m http.server 8000

# Open browser
open http://localhost:8000
```

### Testing Your Changes

1. **Desktop Browser**: Test basic functionality
2. **iOS Safari**: Test with Developer Mode enabled
3. **Console**: Check for errors and warnings
4. **Performance**: Profile with DevTools
5. **Storage**: Verify data persistence

See [TESTING.md](TESTING.md) for detailed testing guide.

## Pull Request Process

1. **Update documentation** if needed
2. **Add examples** for new features
3. **Test on iOS** with Developer Mode
4. **Update README** if adding major features
5. **Describe changes** clearly in PR description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Tested on desktop browser
- [ ] Tested on iOS with Developer Mode
- [ ] No console errors
- [ ] Performance validated

## Checklist
- [ ] Code follows project standards
- [ ] No new dependencies added
- [ ] Documentation updated
- [ ] Examples provided
```

## Code Review

All submissions require review. We look for:
- Code quality and readability
- Performance implications
- Security considerations
- Browser compatibility
- Zero dependency compliance

## Areas for Contribution

### 1. Agent Intelligence
- Advanced decision-making algorithms
- Pattern recognition improvements
- Learning optimizations
- Task decomposition strategies

### 2. WebAssembly Modules
- Math operations (vectors, matrices)
- Signal processing
- String algorithms
- Future: Neural network inference

### 3. Storage Optimizations
- OPFS performance improvements
- IndexedDB query optimizations
- Caching strategies
- Compression algorithms

### 4. Hardware Integration
- Better CPU monitoring
- GPU compute (WebGPU)
- Memory management
- Battery awareness

### 5. Background Processing
- Service Worker enhancements
- Task scheduling improvements
- Background Sync strategies
- Notification systems

### 6. Documentation
- Code examples
- Architecture diagrams
- Performance guides
- iOS setup tutorials

## Research Contributions

We welcome research into:
- New iOS Developer Mode capabilities
- Browser API experiments
- Performance optimization techniques
- Agent architecture patterns
- Distributed agent systems

## Community

### Communication
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and ideas
- Pull Requests: Code contributions

### Code of Conduct
- Be respectful and constructive
- Focus on what's best for the project
- Accept feedback gracefully
- Help others learn and grow

## Recognition

Contributors will be:
- Listed in project credits
- Mentioned in release notes
- Acknowledged in documentation

## Questions?

- Check [IMPLEMENTATION.md](IMPLEMENTATION.md) for architecture details
- See [EXAMPLES.md](EXAMPLES.md) for usage patterns
- Read [DEVELOPER.md](DEVELOPER.md) for technical deep dive
- Open an issue for questions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for helping make CSA.OS better! 🚀
