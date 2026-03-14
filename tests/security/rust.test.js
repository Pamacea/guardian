import { describe, it, expect } from 'vitest';

describe('Rust Security Tests', () => {
  describe('Unsafe Block Patterns', () => {
    it('should detect unsafe block without comment', () => {
      const unsafeCode = `
        fn dangerous() {
            unsafe {
                let ptr = Box::into_raw(Box::new(42));
                *ptr = 100;
            }
        }
      `;

      const hasUnsafe = /\bunsafe\b/.test(unsafeCode);
      const hasComment = unsafeCode.includes('// SAFE') || unsafeCode.includes('// TODO');

      expect(hasUnsafe).toBe(true);
      expect(hasComment).toBe(false); // Missing safety comment
    });

    it('should detect raw pointer usage', () => {
      const rawPtrCode = `
        fn use_raw_ptr() {
            let x = 42;
            let raw = &x as *const i32;
            unsafe {
                println!("raw: {}", *raw);
            }
        }
      `;

      const hasRawPointer = /\*\s*(const|mut)\s+\w+/.test(rawPtrCode);
      expect(hasRawPointer).toBe(true);
    });
  });

  describe('Integer Overflow Patterns', () => {
    it('should detect wrapping arithmetic', () => {
      const wrappingCode = `
        fn calculate(a: u32, b: u32) -> u32 {
            a.wrapping_mul(b)
        }
      `;

      const hasWrapping = /wrapping_(add|sub|mul)/.test(wrappingCode);
      expect(hasWrapping).toBe(true);
    });

    it('should detect unsafe conversion', () => {
      const conversionCode = `
        fn to_usize(value: i64) -> usize {
            value as usize
        }
      `;

      const hasUnsafeCast = /\s+as\s+(u32|u64|i32|i64|usize|isize)\b/.test(conversionCode);
      expect(hasUnsafeCast).toBe(true);
    });
  });

  describe('Serde Deserialization', () => {
    it('should detect unsafe JSON deserialization', () => {
      const serdeCode = `
        use serde_json;
        
        fn parse_input(input: &str) -> Result<Value, Error> {
            let data: serde_json::Value = serde_json::from_str(input)?;
            Ok(data)
        }
      `;

      const hasDirectDeser = /serde_json::from_str\s*\(\s*\w+\s*\)/.test(serdeCode);
      const usesValue = /Value/.test(serdeCode);
      const usesHashMap = /HashMap/.test(serdeCode);

      expect(hasDirectDeser).toBe(true);
      expect(usesValue || usesHashMap).toBe(true);
    });

    it('should detect safe deserialization pattern', () => {
      const safeCode = `
        use serde::Deserialize;
        use validator::Validate;
        
        #[derive(Deserialize, Validate)]
        struct SafeInput {
            #[validate(length(min = 1, max = 100))]
            name: String,
        }
        
        fn parse_safe(input: &str) -> Result<SafeInput, Error> {
            let data: SafeInput = serde_json::from_str(input)?;
            data.validate()?;
            Ok(data)
        }
      `;

      const hasValidation = /validate/.test(safeCode);
      const hasStruct = /struct\s+\w+/.test(safeCode);

      expect(hasValidation).toBe(true);
      expect(hasStruct).toBe(true);
    });
  });

  describe('Framework-Specific Vulnerabilities', () => {
    it('should detect Axum path injection pattern', () => {
      const axumCode = `
        use axum::{routing::get, Router};
        
        async fn get_file(Path(path): Path<String>) -> String {
            format!("Reading: {}", path)
        }
      `;

      const hasPathExtractor = /Path<\s*String\s*>/.test(axumCode);
      const hasValidation = /validate|sanitize|clean/.test(axumCode);

      expect(hasPathExtractor).toBe(true);
      expect(hasValidation).toBe(false); // No validation
    });

    it('should detect Actix query injection pattern', () => {
      const actixCode = `
        use actix_web::{web, HttpRequest};
        
        async fn search(query: web::Query<HashMap<String, String>>) -> HttpResponse {
            let q = query.get("q").unwrap();
            format!("Results for: {}", q)
        }
      `;

      const hasQueryExtractor = /web::Query/.test(actixCode);
      const hasUnwrap = /\.unwrap\(\)/.test(actixCode);
      const hasHashMap = /HashMap/.test(actixCode);

      expect(hasQueryExtractor).toBe(true);
      expect(hasUnwrap || hasHashMap).toBe(true);
    });

    it('should detect Rocket form injection pattern', () => {
      const rocketCode = `
        use rocket::form::Form;
        
        #[post("/submit")]
        async fn submit(form: Form<Input>) -> String {
            format!("Received: {}", form.name)
        }
      `;

      const hasFormExtractor = /Form<\s*\w+\s*>/.test(rocketCode);
      const hasValidation = /validate|guard/.test(rocketCode);

      expect(hasFormExtractor).toBe(true);
      expect(hasValidation).toBe(false); // No validation
    });
  });

  describe('Panic Safety', () => {
    it('should detect panic macro usage', () => {
      const panicCode = `
        fn process(value: Option<i32>) -> i32 {
            match value {
                Some(v) => v,
                None => panic!("Value is required!"),
            }
        }
      `;

      const hasPanic = /panic!\s*\(/.test(panicCode);
      expect(hasPanic).toBe(true);
    });

    it('should detect unwrap usage', () => {
      const unwrapCode = `
        fn get_first(items: Vec<i32>) -> i32 {
            items.first().unwrap()
        }
      `;

      const hasUnwrap = /\.unwrap\(\)/.test(unwrapCode);
      expect(hasUnwrap).toBe(true);
    });

    it('should detect expect usage', () => {
      const expectCode = `
        fn read_config(path: &str) -> String {
            std::fs::read_to_string(path).expect("Failed to read config")
        }
      `;

      const hasExpect = /\.expect\(/.test(expectCode);
      expect(hasExpect).toBe(true);
    });
  });

  describe('Memory Safety Patterns', () => {
    it('should detect use-after-free potential', () => {
      const uafCode = `
        fn potential_uaf() {
            let data = vec
![1, 2, 3];
            let ptr = data.as_ptr();
            drop(data)
;
            // ptr is now dangling
        }
      `;

      const hasBoxIntoRaw = /Box::into_raw/.test(uafCode);
      const hasAsPtr = /\.as_ptr\(\)/.test(uafCode);
      const hasDropBeforeUse = /drop\([^)]+\)/.test(uafCode);

      expect(hasBoxIntoRaw || (hasAsPtr && hasDropBeforeUse))
.toBe(true);
    });

    it('should detect double-free potential', () => {
      const doubleFreeCode = `
        unsafe fn double_free() {
            let ptr = Box::into_raw(Box::new(42));
            let _box1 = Box::from_raw(ptr);
            let _box2 = Box::from_raw(ptr); // Double free!
        }
      `;

      const hasFromRaw = /Box::from_raw/.test(doubleFreeCode);
      expect(hasFromRaw).toBe(true);
    });
  });

  describe('Dependency Vulnerabilities', () => {
    it('should detect vulnerable hyper version pattern', () => {
      const cargoToml = `
        [dependencies]
        hyper = "0.12.0"
        tokio = "1.0"
      `;

      const hasOldHyper = /hyper\s*=\s*["\']0\.12/.test(cargoToml);
      expect(hasOldHyper).toBe(true);
    });

    it('should detect vulnerable openssl version pattern', () => {
      const cargoToml = `
        [dependencies]
        openssl = "0.9"
      `;

      const hasOldOpenssl = /openssl\s*=\s*["\']0\.(9|10)/.test(cargoToml);
      expect(hasOldOpenssl).toBe(true);
    });
  });
});
